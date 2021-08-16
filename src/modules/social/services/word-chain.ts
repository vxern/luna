import { TextChannel } from 'discord.js';

import { Client, GuildMessage } from "../../../client/client";

import { Service } from "../../service";

import { Social } from '../social';

import { Utils } from "../../../utils";

import config from '../../../config.json';

const wordChainEntry = /[\p{L}\- ]+ \([[:ascii:]]+\)( \- [\p{L}[:ascii:]]+ \([[:ascii:]]+\))?/;

export class WordChain extends Service<Social> {
  private wordChainChannels: TextChannel[] = [];
  private instructionTimeouts: Map<string, NodeJS.Timeout> = new Map();

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
    Client.autodelete(Client.warn, message, config.messageAutodeleteInSeconds * 1000,
      'Your submission does not match the supported format.' + this.exampleSubmission,
    );
  }

  async displayInstructions(textChannel: TextChannel) {
    Client.info(textChannel, 
      `Welcome to <#${textChannel.id}>! To participate in the game, write a ` + 
      'word that starts with the final letter/s of the previous word.' +
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
      }, config.messageAutodeleteInSeconds * 1000
    ));
  }

  get exampleSubmission(): string {
    return '\n\nExample submission: ```încotro (whither, where to)```\n' +
      'Optionally, you may also add an example to your submission:' + 
      '```a cunoaște (to know) - Îl cunoști? (Do you know him?)```';
  }
}