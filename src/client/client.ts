import { Client as DiscordClient, ClientUser, TextChannel, Message } from 'discord.js';
import * as string from 'string-sanitizer';

import { Embed } from './embed';

import { Command } from '../modules/command';
import { Module } from '../modules/module';
import { Information } from '../modules/information/information';
import { Moderation } from '../modules/moderation/moderation';
import { Music } from '../modules/music/music';
import { Roles } from '../modules/roles/roles';

import { Service } from '../services/service';
import { Presence } from '../services/presence';

import { Utils } from '../utils';

import config from '../config.json';

export class Client {
  private readonly client: DiscordClient = new DiscordClient();
  static modules: Module[] = Utils.instantiate([Information, Moderation, Music, Roles]);
  static services: Service[] = Utils.instantiate([Presence]);

  static bot: ClientUser;

  /// Begin listening to events
  async initialise() {
    this.client.on('message', (message) => this.handleMessage(message));

    await this.client.login(process.env.DISCORD_SECRET);

    Client.bot = this.client.user!;

    Utils.initialiseServices(Client.services);
    for (const module of Client.modules) {
      module.name = Utils.getNameOfClass(module);
    }

    console.info(`Ready to serve with ${Utils.pluralise('module', Client.modules.length)} and ${Utils.pluralise('service', Client.services.length)}.`);
  }

  private handleMessage(message: Message) {
    // If the message was submitted by a bot
    if (message.author.bot) {
      return;
    }

    // If the message was submitted by the bot itself
    if (message.member!.id === this.client.user!.id) {
      return;
    }

    message.channel = message.channel as TextChannel;

    // If the message was submitted in an excluded channel
    if (string.sanitize.keepUnicode(message.channel.name) in config.excludedChannels) {
      return;
    }

    message.content = Utils.normaliseSpaces(message.content);

    const inAliaslessChannel = config.aliaslessChannels.includes(message.channel.name)
    const messageStartsWithAlias = message.content.toLowerCase().startsWith(config.alias);

    if (!messageStartsWithAlias && !inAliaslessChannel) {
      return;
    }

    if (messageStartsWithAlias) {
      message.content = Utils.removeFirstWord(message.content);
    }

    if (message.content.length === 0) {
      return;
    }
  
    this.resolveCommandHandler(message);
  }

  private resolveCommandHandler(message: Message) {
    const messageLowercase = message.content.toLowerCase();

    const commandMatchesQuery = (command: Command<Module>) => 
      command.identifier.startsWith('$') || 
      messageLowercase.startsWith(command.identifier) || 
      command.aliases.some(
        (alias) => messageLowercase.startsWith(alias)
      );

    const matchedCommand = ([] as Command<Module>[]).concat(...Client.modules
      // Fetch the lists of commands and find those commands whise identifier or aliases match the message content
      .map((module) => module.commands.filter(commandMatchesQuery))
    )[0] || undefined;

    if (matchedCommand === undefined) {
      Client.warn(message.channel as TextChannel, 'Unknown command');
      return;
    }
    
    if (!matchedCommand.identifier.startsWith('$')) {
      message.content = Utils.removeFirstWord(message.content);
    }

    const argumentsSupplied = Utils.getWords(message.content).length;
    const argumentsOptional = matchedCommand.arguments.filter((argument) => argument.startsWith('optional:')).length;
    const argumentsRequired = matchedCommand.arguments.length - argumentsOptional;

    const tooFewArguments = argumentsSupplied < argumentsRequired;
    const tooManyArguments = argumentsRequired !== 1 && (
      argumentsSupplied > argumentsRequired && argumentsSupplied > argumentsOptional
    );

    const isSingleton = matchedCommand.identifier.startsWith('$');

    if ((tooFewArguments || tooManyArguments) && !isSingleton) {
      const optionalArgumentsString = argumentsOptional > 1 ? `, and can additionally take up to ${Utils.pluralise('optional argument', argumentsOptional)}` : ''
      Client.warn(message.channel as TextChannel,
        `This command requires ${Utils.pluralise('argument', argumentsRequired)}${optionalArgumentsString}.\n\n` +
        'Usage ' + matchedCommand.getUsage
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
    const dependencies: [any, any][] = neededDependencies.map(
      (dependency) => [dependency, matchedCommand.module.commands.find(
        (command) => Utils.capitaliseWords(command.identifier) === dependency,
      )]
    );

    matchedCommand.handler(message, new Map(dependencies));
  }

  static async send(textChannel: TextChannel, embed: Embed): Promise<Message> {
    return textChannel.send({embed: {
      title: embed.title,
      thumbnail: {url: embed.thumbnail},
      description: embed.message,
      color: embed.color,
      fields: embed.fields,
    }})
  }

  /// Send an embedded message with a tip
  static async tip(textChannel: TextChannel, message: string): Promise<Message> {
    return this.send(textChannel, new Embed({
      message: `:information_source: ` + message,
      color: config.accentColorTip,
    }));
  }

  /// Send an embedded message with an informational message
  static async info(textChannel: TextChannel, message: string): Promise<Message> {
    return this.send(textChannel, new Embed({message: message}));
  }

  /// Send an embedded message with a warning
  static async warn(textChannel: TextChannel, message: string): Promise<Message> {
    return this.send(textChannel, new Embed({
      message: `:warning: ` + message,
      color: config.accentColorWarning,
    }));
  }

  /// Send an embedded message with an error
  static async severe(textChannel: TextChannel, message: string): Promise<Message> {
    return this.send(textChannel, new Embed({
      message: `:exclamation: ` + message,
      color: config.accentColorSevere,
    }));
  }
}