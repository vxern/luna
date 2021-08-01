import { Client as DiscordClient, ClientUser, TextChannel, Message } from 'discord.js';
import * as string from 'string-sanitizer';

import { Embed } from './embed';

import { Module } from '../modules/module';
import { Music } from '../modules/music/music';
import { Roles } from '../modules/roles/roles';

import { Service } from '../services/service';
import { Presence } from '../services/presence';

import { Utils } from '../utils';

import config from '../config.json';
import { Command } from '../modules/command';

export class Client {
  private readonly client: DiscordClient = new DiscordClient();
  private modules: Module[] = Utils.instantiated([Music, Roles]);
  private services: Service[] = Utils.instantiated([Presence]);

  static bot: ClientUser;

  /// Begin listening to events
  async initialise() {
    this.client.on('message', (message) => this.handleMessage(message));

    await this.client.login(process.env.DISCORD_SECRET);

    Client.bot = this.client.user!;

    Utils.initialiseServices(this.services);

    console.info(`Ready to serve with ${this.modules.length} modules and ${this.services.length} services.`);
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
      // TODO: this.help(message.channel);
      return;
    }
  
    this.findCommandHandler(message);
  }

  private findCommandHandler(message: Message) {
    const messageLowercase = message.content.toLowerCase();

    const commandMatchesQuery = (command: Command<Module>) => 
      command.identifier.startsWith('$') || 
      messageLowercase.startsWith(command.identifier) || 
      command.aliases.some(
        (alias) => messageLowercase.startsWith(alias)
      );

    const matchedCommand = ([] as Command<Module>[]).concat(...this.modules
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

    const numberOfArguments = Utils.valueOrEmpty(message.content.split(' ').length, message.content.length);

    if ((numberOfArguments !== matchedCommand.arguments.length && matchedCommand.arguments.length !== 1 ) &&
        matchedCommand.arguments.length !== 0) {
      const orAliases = Utils.valueOrEmpty(` or (${Utils.join(matchedCommand.aliases, 'or')}) `, matchedCommand.aliases.length);
      const requiredArguments = Utils.valueOrEmpty(matchedCommand.arguments.map((argument) => ` [${argument}]`).join(' '), matchedCommand.arguments.length);
      Client.warn(message.channel as TextChannel,
        `The \`${matchedCommand.identifier}\` command requires ${matchedCommand.arguments.length} ${Utils.pluralise('argument', matchedCommand.arguments.length)}.\n\n` +
        'Usage: ' + matchedCommand.identifier + orAliases + requiredArguments
      );
      return;
    }

    // Do not call the handlers of commands whise requirement hasn't been met
    if (!matchedCommand.module.requirementMet(message)) {
      return;
    }

    const neededDependencies = Utils.getNamesOfDependencies(matchedCommand.dependencies);
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
  static async error(textChannel: TextChannel, message: string): Promise<Message> {
    return this.send(textChannel, new Embed({
      message: `:exclamation: ` + message,
      color: config.accentColorError,
    }));
  }
}