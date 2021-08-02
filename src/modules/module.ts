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
  async unimplemented(message: Message) {
    Client.error(message.channel as TextChannel, 'This function is not yet implemented');
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
      Client.warn(message.channel as TextChannel, 'You have not provided a valid time description as one of the required terms is missing');
      return;
    }

    // The number of keys does not match the number of values
    if (integers.length !== strings.length) {
      Client.warn(message.channel as TextChannel, 'The number of time specifiers and values does not match');
      return;
    }

    if (integers.includes(0)) {
      Client.warn(message.channel as TextChannel, 'A time value cannot be 0');
      return;
    }

    const secondIdentifiers = ['s', 'sec', 'second', 'seconds'];
    const minuteIdentifiers = ['m', 'min', 'minute', 'minutes'];
    const hourIdentifiers = ['h', 'hr', 'hour', 'hours'];

    for (let index = 0; index < integers.length; index++) {
      let multiplier = 1;

      if (minuteIdentifiers.includes(strings[index])) {
        multiplier = 60;
      }

      if (hourIdentifiers.includes(strings[index])) {
        multiplier = 60 * 60;
      }

      if (multiplier === 1 && !secondIdentifiers.includes(strings[index])) {
        Client.warn(message.channel as TextChannel, `'${strings[index]}' is not a valid time specifier'`);
      }

      seconds += integers[index] * multiplier;
    }

    return seconds;
  }

  /// Decides whether the requirement for usage of a module has been met
  requirementMet(message: Message): boolean {
    if (typeof this.requirement === 'boolean') {
      return this.requirement;
    }
    
    return this.requirement(message);
  }

  async browse<T>(originalMessage: Message, list: T[]): Promise<T | undefined> {
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
    
    const isNotOnFirstPage = () => currentPage !== 0;
    const isNotOnLastPage = () => currentPage !== pages.length - 1;

    const validReactions = ['➡️', '⬅️', '❌'];

    return await new Promise<T | undefined>(async (resolveUrl) => {
      let cancelled = false;
      let complete = false;

      while (true) {
        await new Promise<void>(async (updateList) => {
          // Display the list of choices to the user
          const pageMessage = await Client.send(textChannel, Embed.singleField({
            name: 'Select a song below by writing its index',
            value: pages[currentPage].map(
              (listing, index) => `**${index + 1}** ~ ${listing.title}`
            ).join('\n\n'),
            inline: false,
          }));

          // If the current page is the first page, there should be no choice to move backwards
          if (isNotOnFirstPage()) {
            pageMessage.react('⬅️');
          }

          // Similarly, if the current page is the last page, there should be no choice to move forwards
          if (isNotOnLastPage()) {
            pageMessage.react('➡️');
          }

          pageMessage.react('❌');
    
          const reactions = pageMessage.createReactionCollector(validReaction);  
          const responses = pageMessage.channel.createMessageCollector(validSelection, {time: config.queryTimeout * 1000});  

          reactions.on('collect', async (reaction) => {
            if (!validReactions.includes(reaction.emoji.name)) {
              return;
            }
            
            pageMessage.delete();
            
            switch (reaction.emoji.name) {
              case '⬅️':
                if (isNotOnFirstPage()) {
                  currentPage -= 1;
                }
                break;
              case '➡️':
                if (isNotOnLastPage()) {
                  currentPage += 1;
                }
                break;
              case '❌':
                cancelled = true;
                originalMessage.delete();
                return closeBrowser();
              default:
                break;
            }
            
            updateList();
          });

          responses.on('collect', (response) => {
            const index = Number(response.content);
            
            if (!Utils.isIndexInBounds(textChannel, index, config.itemsPerPage)) {
              return;
            }

            complete = true;
            closeBrowser(pages[currentPage][index - 1]);
          });

          responses.on('end', () => {
            if (!cancelled && !complete) {
              Client.warn(textChannel, 'Query timed out');
            }
          })

          function closeBrowser(selection?: T) {
            reactions.stop();
            responses.stop();
            resolveUrl(selection ?? undefined);
          }
        });
      }
    });
  }
}