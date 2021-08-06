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
    const isCallingBot = message.content.toLowerCase().startsWith(config.alias);

    if (!isCallingBot && !inAliaslessChannel) return;

    if (isCallingBot) {
      message.content = Utils.removeFirstWord(message.content);
    }

    if (message.content.length === 0) return;
  
    this.resolveCommandHandler(message);
  }

  private resolveCommandHandler(message: GuildMessage) {
    const firstWord = message.content.toLowerCase().split(' ')[0];

    const commandMatchesQuery = (command: Command<Module>) => {
      const isIdentifier = firstWord === command.identifier;
      const isAlias = command.aliases.some((alias) => firstWord === alias);
      const isSingletonCommand = command.identifier.startsWith('$');

      return isIdentifier || isAlias || isSingletonCommand;
    }

    const matchedCommand = Client.commands.find(commandMatchesQuery);

    if (matchedCommand === undefined) {
      Client.warn(message.channel, 'Unknown command.');
      return;
    }
    
    // If the matched command is not a singleton, the first word (the command)
    // still needs to be removed from the content of the message
    if (!matchedCommand.identifier.startsWith('$')) {
      message.content = Utils.removeFirstWord(message.content);
    }

    const isParameterOptional = (parameter: string) => parameter.startsWith('optional:');

    const parametersRequired = matchedCommand.parameters
      .filter((parameter) => !isParameterOptional(parameter));
    const parametersOptional = matchedCommand.parameters
      .filter(isParameterOptional)
      .map((parameterWithKeyword) => parameterWithKeyword.split(' ')[1]);
    const parameters = [...parametersRequired, ...parametersOptional];
    const parametersParsable = parameters.map((parameter) => parameter + ':');
    
    // If the user forgot to separate the parameter from the argument using
    // a space, it is necessary to separate it before parsing
    message.content = message.content
      .split(' ')
      .map((word) => {
        if (word.includes(':') && !word.endsWith(':')) {
          word = word.split(':').join(': ');
        }
        return word;
      })
      .join(' ');

    // Extract the words from the message, making sure parameters are transformed 
    // to lowercase format, not affecting the case of other words
    const words = Utils.getWords(message.content)
      .map((word) => {
        const wordLowercase = word.toLowerCase();
        return parametersParsable.includes(wordLowercase) ? wordLowercase : word;
      });

    const args = new Map<string, string>();

    for (const parameter of parametersParsable) {
      if (!words.includes(parameter)) continue;

      const start = words.indexOf(parameter);
      let end = words.slice(start + 1).findIndex((word) => word.endsWith(':'));
      if (end === -1) end = words.length; // No more parameters found in the words

      const extracted = words.splice(start, end - start + 1);
      extracted.shift(); // Remove the parameter

      args.set(parameter.replace(':', ''), extracted.join(' '));
    }

    const providedArgs = Object.keys(args);
    const missingRequiredParameters = parametersRequired.filter((parameter) => !providedArgs.includes(parameter));

    if (words.length !== 0 && missingRequiredParameters.length === 1) {
      args.set(missingRequiredParameters[0], words.splice(0).join(' '));
    }

    // Do not call the handlers of commands whise requirement hasn't been met
    if (
      matchedCommand.module.commandsRestricted.includes(matchedCommand) && 
      !matchedCommand.module.isRequirementMet(message)
    ) {
      return;
    }

    // A 'singleton' command doesn't take any arguments, and doesn't have an identifier
    const isSingleton = matchedCommand.identifier.startsWith('$');

    const tooFewArguments = missingRequiredParameters.length > 0;
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

    const firstArgument = args.values().next().value ?? (words.length !== 0 ? message.content : undefined);

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