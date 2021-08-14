import { TextChannel } from 'discord.js';

import { Client, GuildMessage } from "../client/client";
import { Utils } from "../utils";

import { Service } from "./service";

import config from '../config.json';

const wordChainEntry = /([\w ]+) ([\[({].+[\])}])/;

export class WordChain extends Service {
  wordChainChannels: TextChannel[] = [];
  instructionTimeouts: Map<string, NodeJS.Timeout> = new Map();

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

    if (!wordChainEntry.test(message.content)) {
      return this.displayUsage(message);
    }

    this.postInstructions(message.channel);
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
    return `Example submission: \`încotro (whither, where to)\``;
  }
}