import { Client as DiscordClient, ClientUser, TextChannel, Message as DiscordMessage } from 'discord.js';
import * as string from 'string-sanitizer';

import { Embed } from './embed';

import { Database } from '../database/database';

import { Command } from '../modules/command';
import { Module } from '../modules/module';
import { Information } from '../modules/information/information';
import { Moderation } from '../modules/moderation/moderation';
import { Music } from '../modules/music/music';
import { Roles } from '../modules/roles/roles';

import { Service } from '../services/service';
import { Presence } from '../services/presence';

import { ModifySignature, Utils } from '../utils';

import config from '../config.json';

export type GuildMessage = ModifySignature<DiscordMessage, {channel: TextChannel}>;

export class Client {
  private readonly client: DiscordClient = new DiscordClient();
  static modules: Module[] = Utils.instantiate([Information, Moderation, Music, Roles]);
  static services: Service[] = Utils.instantiate([Presence]);
  static commands: Command<Module>[];
  static database: Database = new Database();
  static bot: ClientUser;

  /// Begin listening to events
  async initialise() {
    this.client.on('message', (message) => {
      if (message.channel.type !== 'text') {
        return;
      }

      this.handleMessage(message as GuildMessage);
    });

    await this.client.login(process.env.DISCORD_SECRET);

    Client.bot = this.client.user!;

    Utils.initialiseServices(Client.services);
    for (const module of Client.modules) {
      module.name = Utils.getNameOfClass(module);
    }

    Client.commands = ([] as Command<Module>[]).concat(...Client.modules.map((module) => module.commandsAll));

    console.info(`Ready to serve with ${Utils.pluralise('module', Client.modules.length)} and ${Utils.pluralise('service', Client.services.length)}.`);
  }

  private handleMessage(message: GuildMessage) {
    // If the message was submitted by a bot
    if (message.author.bot) {
      return;
    }

    // If the message was submitted by the bot itself
    if (message.member!.id === this.client.user!.id) {
      return;
    }

    // If the message was submitted in an excluded channel
    if (string.sanitize(message.channel.name) in config.excludedChannels) {
      return;
    }

    message.content = Utils.normaliseSpaces(message.content);

    const inAliaslessChannel = config.aliaslessChannels.includes(message.channel.name)
    const messageStartsWithBotAlias = message.content.toLowerCase().startsWith(config.alias);

    if (!messageStartsWithBotAlias && !inAliaslessChannel) {
      return;
    }

    if (messageStartsWithBotAlias) {
      message.content = Utils.removeFirstWord(message.content);
    }

    if (message.content.length === 0) {
      return;
    }
  
    this.resolveCommandHandler(message);
  }

  private resolveCommandHandler(message: GuildMessage) {
    const commandMatchesQuery = (command: Command<Module>) => {
      const args = message.content.toLowerCase().split(' ');

      return command.identifier.startsWith('$') ||
        args[0] === command.identifier ||
        command.aliases.some(
          (alias) => args[0] === alias
        );
    }

    const matchedCommand = ([] as Command<Module>[]).concat(...Client.modules
      // Fetch the lists of commands and find those commands whise identifier or aliases match the message content
      .map((module) => module.commandsAll.filter(commandMatchesQuery))
    )[0] || undefined;

    if (matchedCommand === undefined) {
      Client.warn(message.channel, 'Unknown command.');
      return;
    }
    
    if (!matchedCommand.identifier.startsWith('$')) {
      message.content = Utils.removeFirstWord(message.content);
    }

    const isParameterOptional = (parameter: string) => parameter.startsWith('optional:');

    const parametersOptional = matchedCommand.parameters
      .filter(isParameterOptional)
      .map((parameterWithKeyword) => parameterWithKeyword.split(' ')[1]);
    const parametersRequired = matchedCommand.parameters.filter((parameter) => !isParameterOptional(parameter));
    const parameters = [...parametersRequired, ...parametersOptional].map((value) => value + ':');
    
    // If the caster accidentally forgot to add a space after a semicolon,
    // it is necessary to add it back for the content to be split correctly.
    message.content = message.content
      .split(' ')
      .map((value) => {
        if (value.includes(':') && !value.endsWith(':')) {
          value = value.split(':').join(': ');
        }
        return value;
      })
      .join(' ');

    const words = Utils.getWords(message.content).map((word) => {
      const wordLowercase = word.toLowerCase();
      return parameters.includes(wordLowercase) ? wordLowercase : word;
    });

    const args = new Map<string, string>();
    for (let index = 0; index < parameters.length; index++) {
      const start = words.indexOf(parameters[index]);
      const end = words.indexOf(parameters[index + 1]);
      const extracted = words.splice(
        start + 1, 
        end === -1 || start > end ? 
          words.length : 
          end - start - 1
        ).join(' ');
      if (start !== -1) {
        words.splice(start, 1);
      }

      if (extracted.length === 0) {
        break;
      }

      args.set(parameters[index].replace(':', ''), extracted); 
    }

    const firstArgument = args.values().next().value ?? (words.length !== 0 ? message.content : undefined);

    // A 'singleton' command doesn't take any arguments, and doesn't have an identifier
    const isSingleton = matchedCommand.identifier.startsWith('$');

    const tooFewArguments = args.size < parametersRequired.length;
    const tooManyArguments = words.length !== 0;

    if (!isSingleton && (tooFewArguments || tooManyArguments)) {
      const optionalArgumentsString = parametersOptional.length > 1 ? 
        `, and can additionally take up to ${Utils.pluralise('optional argument', parametersOptional.length)}` : 
        ''
      Client.warn(message.channel,
        `This command requires ${Utils.pluralise('argument', parametersRequired.length)}${optionalArgumentsString}.\n\n` +
        'Usage: ' + matchedCommand.getUsage
      );
      return;
    }

    // Do not call the handlers of commands whise requirement hasn't been met
    if (
      matchedCommand.module.commandsRestricted.includes(matchedCommand) && 
      !matchedCommand.module.isRequirementMet(message)
    ) {
      return;
    }

    const neededDependencies = matchedCommand.dependencies.map((dependency) => Utils.getNameOfClass(dependency));
    const dependencies = new Map(neededDependencies.map(
      (dependency) => [dependency, Client.commands.find(
        (command) => Utils.capitaliseWords(command.identifier) === dependency,
      )]
    ).filter(([_, value]) => value !== undefined) as [string, Command<Module>][]);

    matchedCommand.handler({
      message: message, 
      dependencies: dependencies,
      parameters: args,
      parameter: firstArgument,
    });
  }

  static async send(textChannel: TextChannel, embed: Embed): Promise<GuildMessage> {
    return textChannel.send({embed: {
      title: embed.title,
      thumbnail: {url: embed.thumbnail},
      description: embed.message,
      color: embed.color,
      fields: embed.fields,
    }}) as Promise<GuildMessage>;
  }

  /// Send an embedded message with a tip
  static async tip(textChannel: TextChannel, message: string): Promise<GuildMessage> {
    return this.send(textChannel, new Embed({
      message: `:information_source: ` + message,
      color: config.accentColorTip,
    }));
  }

  /// Send an embedded message with an informational message
  static async info(textChannel: TextChannel, message: string): Promise<GuildMessage> {
    return this.send(textChannel, new Embed({message: message}));
  }

  /// Send an embedded message with a warning
  static async warn(textChannel: TextChannel, message: string): Promise<GuildMessage> {
    return this.send(textChannel, new Embed({
      message: `:warning: ` + message,
      color: config.accentColorWarning,
    }));
  }

  /// Send an embedded message with an error
  static async severe(textChannel: TextChannel, message: string): Promise<GuildMessage> {
    return this.send(textChannel, new Embed({
      message: `:exclamation: ` + message,
      color: config.accentColorSevere,
    }));
  }
}