import { TextChannel } from 'discord.js';

import { Client, GuildMessage } from "../client/client";
import { Utils } from "../utils";

import { Service } from "./service";

import config from '../config.json';

const wordChainEntry = /(#\d+) ([\w ]+) ([\[({].+[\])}])/;

export class WordChain extends Service {
  wordChainChannels: TextChannel[] = [];
  instructionTimeouts: Map<string, NodeJS.Timeout> = new Map();
  expectedSubmissionIndex: number = 0;

  async initialise() {
    Client.bot.client.on('message', (message) => {
      if (message.channel.type !== 'text') return;

      this.handleMessage(message as GuildMessage);
    });

    this.wordChainChannels = Client.getChannelsByName(config.wordChainChannel);

    for (const channel of this.wordChainChannels) {
      this.postInstructions(channel);
    }
  }

  async handleMessage(message: GuildMessage) {
    // If the message was submitted by the bot itself
    if (message.member!.id === Client.bot.id) return;

    // If the message was posted in a channel different to the designated channel
    if (Utils.extractWords(message.channel.name).join(' ') !== Utils.extractWords(config.wordChainChannel).join(' ')) { 
      return;
    }

    if (this.expectedSubmissionIndex === 0) {
      const lastSubmissions = Array.from((await message.channel.messages.fetch()).values());
      const mostRecentSubmission = lastSubmissions.find((message) => wordChainEntry.test(message.content));
      
      if (mostRecentSubmission !== undefined) {
        const mostRecentSubmissionIndex = Number(Utils.extractNumbers(mostRecentSubmission.content)[0]);
        this.expectedSubmissionIndex = mostRecentSubmissionIndex + 1;
      }
    }

    this.postInstructions(message.channel);

    if (!wordChainEntry.test(message.content)) {
      return this.displayUsage(message);
    }
    
    // If the user managed to copy the example submission literally
    if (Utils.areSimilar(message.content, `#${this.expectedSubmissionIndex} <word> (<definition>)`)) {
      Client.autodelete(Client.warn, message, 10 * 1000,
        'You are not meant to copy the example submission __literally__ :person_facepalming:.',
      );
      return;
    }
    
    const [index, word, definition] = wordChainEntry.exec(message.content)!.slice(1, 4);

    const number = Number(index.replace('#', ''));
    
    if (number !== this.expectedSubmissionIndex + 1) {
      Client.autodelete(Client.warn, message, 10 * 1000,
        `Your submission was expected to be number ${this.expectedSubmissionIndex}, ` + 
        `but instead it was found with number ${number}.`,
      );
    }
  }

  async displayUsage(message: GuildMessage) {
    Client.autodelete(Client.warn, message, 10 * 1000,
      'Your submission does not match the supported format.\n\n' + this.exampleSubmission,
    );
  }

  async displayInstructions(textChannel: TextChannel) {
    Client.info(textChannel, 
      `Welcome to <#${textChannel.id}>! To participate in the game, write a ` + 
      'word that starts with the final letter/s of the previous word.\n\n' +
      this.exampleSubmission
    );
  }

  async postInstructions(textChannel: TextChannel) {
    // Remove bot's previous messages
    textChannel.messages.fetch().then((messages) => messages.forEach(
      (message) => {
        if (message.author.id === Client.bot.id) {
          message.delete();
        }
      })
    );

    if (this.instructionTimeouts.has(textChannel.id)) {
      clearTimeout(this.instructionTimeouts.get(textChannel.id)!);
      return;
    }

    this.instructionTimeouts.set(textChannel.id, setTimeout(
      () => {
        this.displayInstructions(textChannel);
        this.instructionTimeouts.delete(textChannel.id);
      }, 10 * 1000
    ));
  }

  get exampleSubmission(): string {
    return `Example submission: \`#${this.expectedSubmissionIndex + 1} <word> (<definition>)\``;
  }
}