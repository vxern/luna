import { TextChannel, User } from "discord.js";

import { Client, GuildMessage } from "../client/client";
import { Embed } from "../client/embed";

import { Command, HandlingData } from "./command";

import { Utils } from "../utils";

import config from '../config.json';

type TimeDescriptor = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

export abstract class Module {
  /// Automatically assigned name of this module
  name!: string;
  /// A function deciding whether a user can use an affected command
  readonly requirement: ((message: GuildMessage) => boolean) | boolean = true;
  /// Commands which require `requirement` to yield `true` for execution
  readonly commandsRestricted: Command<Module>[] = [];
  /// Commands which are not affected by this module's requirement
  readonly commandUnrestricted: Command<Module>[] = [];
  /// Getter for all commands contained within 
  get commandsAll(): Command<Module>[] {
    return [...this.commandsRestricted, ...this.commandUnrestricted];
  }

  /// Placeholder command for unimplemented functionality
  async displayUnimplemented({message}: HandlingData) {
    Client.severe(message.channel, 'This function is not yet implemented.');
  }
  
  /// Parses a time query to a base number of seconds described by the query
  resolveTimeQuery(
    textChannel: TextChannel, 
    query: string, 
    accept: (TimeDescriptor)[],
    output: TimeDescriptor
  ): number {
    let seconds = 0;

    // Extract the digits present in the query
    const values = Utils.extractNumbers(query).map((string) => Number(string));
    // Extract the strings present in the query
    const keys = Utils.extractWords(query);

    // No parameters provided for either keys or values
    if (values.length === 0 || keys.length === 0) {
      Client.warn(textChannel, 'You have not provided a valid time description as one of the required keys or values is missing.');
      return -1;
    }

    // The number of keys does not match the number of values
    if (values.length !== keys.length) {
      Client.warn(textChannel, 'The number of keys and values does not match.');
      return -1;
    }

    if (values.includes(0)) {
      Client.warn(textChannel, 'A time value cannot be equal to 0.');
      return -1;
    }

    const invalidKey = keys.find((key) => !accept.includes(key as TimeDescriptor));
    if (invalidKey !== undefined) {
      Client.warn(textChannel, `${invalidKey} is not a valid key or is not accepted by this command.`);
      return -1;
    }

    const secondDescriptors = ['s', 'sec', 'second', 'seconds'];
    const minuteDescriptors = ['m', 'min', 'minute', 'minutes'];
    const hourDescriptors = ['h', 'hr', 'hour', 'hours'];
    const dayDescriptors = ['d', 'day', 'days'];
    const weekDescriptors = ['w', 'wk', 'week', 'weeks'];
    const monthDescriptors = ['M', 'month', 'months'];
    const yearDescriptors = ['y', 'year', 'years'];

    for (let index = 0; index < values.length; index++) {
      let multiplier = 1;

      if (minuteDescriptors.includes(keys[index])) multiplier = 60;
      if (hourDescriptors.includes(keys[index])) multiplier = 60 * 60;
      if (dayDescriptors.includes(keys[index])) multiplier = 60 * 60 * 24;
      if (weekDescriptors.includes(keys[index])) multiplier = 60 * 60 * 24 * 7;
      if (monthDescriptors.includes(keys[index])) multiplier = 60 * 60 * 24 * 30;
      if (yearDescriptors.includes(keys[index])) multiplier = 60 * 60 * 24 * 365;

      if (multiplier === 1 && !secondDescriptors.includes(keys[index])) {
        Client.warn(textChannel, `'${keys[index]}' is not a valid time specifier.`);
      }

      seconds += values[index] * multiplier;
    }

    let result;

    switch (output) {
      case 'second':
        result = seconds;
        break;
      case 'minute':
        result = seconds / 60;
        break;
      case 'hour':
        result = seconds / 60 / 60;
        break;
      case 'day':
        result = seconds / 60 / 60 / 24;
        break;
      case 'week':
        result = seconds / 60 / 60 / 24 / 7;
        break;
      case 'month':
        result = seconds / 60 / 60 / 24 / 30;
        break;
      case 'year':
        result = seconds / 60 / 60 / 24 / 365;
        break;
    }

    return Math.floor(result);
  }

  /// Decides whether the requirement for usage of a module has been met
  isRequirementMet(message: GuildMessage): boolean {
    if (typeof this.requirement === 'boolean') return this.requirement;
    
    return this.requirement(message);
  }

  /// Creates a browsing menu which allows the user to make a selection from
  /// a list of available options
  ///
  /// [displayString] - How the string to display is obtained from the object
  async browse<T>(originalMessage: GuildMessage, list: T[], displayMethod: (entry: T) => string): Promise<T | undefined> {
    const browser = originalMessage.author;
    const textChannel = originalMessage.channel;

    // Metrics for which reactions and responses in the form of selections count
    const validReaction = (_: any, user: User) => user.id === browser.id;
    const validSelection = (response: GuildMessage) => response.author.id === browser.id && Utils.isNumber(response.content);

    // How many pages the list of selections can be broken down into
    const numberOfPages = Math.ceil(list.length / config.itemsPerPage);
    // List of selections broken down into single pages
    const pages = Utils.splitIntoChunks(list, numberOfPages);
    let currentPage = 0;

    return await new Promise<T | undefined>(async (resolveUrl) => {
      const isNotOnFirstPage = () => currentPage !== 0;
      const isNotOnLastPage = () => currentPage !== pages.length - 1;

      const validReactions = ['➡️', '⬅️', '❌'];

      let selection: T | undefined = undefined;

      while (true) {
        await new Promise<void>(async (updateList) => {
          const pageMessage = await Client.send(textChannel, Embed.singleField({
            name: 'Make a selection by writing its index.',
            value: pages[currentPage].map(
              (entry, index) => `**${index + 1}** ~ ${displayMethod(entry)}`
            ).join('\n\n'),
            inline: false,
          }));

          if (isNotOnFirstPage()) pageMessage.react('⬅️');
          if (isNotOnLastPage()) pageMessage.react('➡️');

          pageMessage.react('❌');
    
          const reactions = pageMessage.createReactionCollector(validReaction);  
          const responses = pageMessage.channel.createMessageCollector(validSelection, {time: config.queryTimeout * 1000});  

          reactions.on('collect', async (reaction) => {
            if (!validReactions.includes(reaction.emoji.name)) return;
            
            pageMessage.delete();
            
            switch (reaction.emoji.name) {
              case '⬅️':
                if (isNotOnFirstPage()) currentPage--;
                break;
              case '➡️':
                if (isNotOnLastPage()) currentPage++;
                break;
              case '❌':
                originalMessage.delete();
                return responses.stop('cancelled');
              default:
                break;
            }
            
            updateList();
          });

          responses.on('collect', (response) => {
            const index = Number(response.content);
            
            if (!Utils.isIndexInBounds(textChannel, index, config.itemsPerPage)) return;

            selection = pages[currentPage][index - 1];
            responses.stop('complete');
          });

          responses.on('end', (_, reason) => {
            if (reason !== 'complete' && reason !== 'cancelled') {
              Client.warn(textChannel, 'Query timed out.');
            }

            reactions.stop();
            resolveUrl(selection);
          });
        });
      }
    });
  }
}