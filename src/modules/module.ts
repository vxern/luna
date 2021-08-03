import { Message, TextChannel, User } from "discord.js";

import { Client } from "../client/client";
import { Embed } from "../client/embed";
import { Utils } from "../utils";

import { Command } from "./command";

import config from '../config.json';

export abstract class Module {
  /// Automatically assigned name of this module
  name!: string;
  /// A function deciding whether a user can use an affected command
  readonly requirement: ((message: Message) => boolean) | boolean = true;
  /// Commands which require `requirement` to yield `true` for execution
  readonly commandsRestricted: Command<Module>[] = [];
  /// Commands which are not affected by this module's requirement
  readonly commandUnrestricted: Command<Module>[] = [];
  /// Getter for all commands contained within 
  get commands(): Command<Module>[] {
    return [...this.commandsRestricted, ...this.commandUnrestricted];
  }

  /// Placeholder command for unimplemented functionality
  async displayUnimplemented(message: Message) {
    Client.severe(message.channel as TextChannel, 'This function is not yet implemented.');
  }
  
  /// Parses a time query to a base number of seconds described by the query
  resolveTimeQuery(message: Message, query: string): number | undefined {
    let seconds = 0;

    // Extract the digits present in the query
    const integers = Utils.extractNumbers(query);
    // Extract the strings present in the query
    const strings = Utils.extractWords(query);

    // No parameters provided for either keys or values
    if (integers.length === 0 || strings.length === 0) {
      Client.warn(message.channel as TextChannel, 'You have not provided a valid time description as one of the required terms is missing.');
      return;
    }

    // The number of keys does not match the number of values
    if (integers.length !== strings.length) {
      Client.warn(message.channel as TextChannel, 'The number of time specifiers and values does not match.');
      return;
    }

    if (integers.includes(0)) {
      Client.warn(message.channel as TextChannel, 'A time value cannot be equal to 0.');
      return;
    }

    const secondIdentifiers = ['s', 'sec', 'second', 'seconds'];
    const minuteIdentifiers = ['m', 'min', 'minute', 'minutes'];
    const hourIdentifiers = ['h', 'hr', 'hour', 'hours'];

    for (let index = 0; index < integers.length; index++) {
      let multiplier = 1;

      if (minuteIdentifiers.includes(strings[index])) multiplier = 60;
      if (hourIdentifiers.includes(strings[index])) multiplier = 60 * 60;

      if (multiplier === 1 && !secondIdentifiers.includes(strings[index])) {
        Client.warn(message.channel as TextChannel, `'${strings[index]}' is not a valid time specifier.`);
      }

      seconds += integers[index] * multiplier;
    }

    return seconds;
  }

  /// Decides whether the requirement for usage of a module has been met
  isRequirementMet(message: Message): boolean {
    if (typeof this.requirement === 'boolean') return this.requirement;
    
    return this.requirement(message);
  }

  /// Creates a browsing menu which allows the user to make a selection from
  /// a list of available options
  ///
  /// [displayString] - How the string to display is obtained from the object
  async browse<T>(originalMessage: Message, list: T[], displayMethod: (entry: T) => string): Promise<T | undefined> {
    const browser = originalMessage.author;
    const textChannel = originalMessage.channel as TextChannel;

    // Metrics for which reactions and responses in the form of selections count
    const validReaction = (_: any, user: User) => user.id === browser.id;
    const validSelection = (response: Message) => response.author.id === browser.id && Utils.isNumber(response.content);

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
                if (isNotOnFirstPage()) currentPage -= 1;
                break;
              case '➡️':
                if (isNotOnLastPage()) currentPage += 1;
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