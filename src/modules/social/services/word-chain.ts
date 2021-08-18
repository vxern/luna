import { TextChannel } from 'discord.js';

import { Client, GuildMessage } from "../../../client/client";
import { Embed } from '../../../client/embed';

import { Service } from "../../service";

import { Social } from '../social';

import { Utils } from "../../../utils";

import config from '../../../config.json';

const submission = /(word:.+)([ |\n]+?definition:.+)(([ |\n]+?example:.+)([ |\n]+?translation:.+))?/iu;
const definitionDivider = / *(,|;) */g;

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

    if (!submission.test(message.content)) {
      return this.displayUsage(message);
    }

    const regexResult = Array.from(submission.exec(message.content)!)
      .filter((field) => field !== undefined)
      .map((field) => field.split(':').slice(1).join(':').trimStart());
    const [entry, definitions] = regexResult.slice(1, 3).map((word) => word.toLowerCase());
    const [example, translation] = regexResult.slice(4, 6);

    const fields = [];

    fields.push(
      {name: 'Word', value: entry, inline: true},
      {name: 'Definition', value: definitions, inline: true}
    );

    if (example !== undefined) {
      if (!Utils.includes(example, entry)) {
        return Client.autodelete(Client.warn, message, config.messageAutodeleteInSeconds * 1000,
          `The example sentence you provided does not contain the word you're attempting to submit (${example}).` + 
          this.exampleSubmission,
        );
      }

      const uniformExample = Utils.makeUniformAndHighlightWord(example, [entry]);
      const uniformTranslation = Utils.makeUniformAndHighlightWord(translation, definitions.split(definitionDivider));

      fields.push(
        {name: 'Example', value: uniformExample, inline: false},
        {name: 'Translation', value: uniformTranslation, inline: false},
      );
    }

    Client.send(message.channel, new Embed({
      title: `'${entry}' by *${message.author.username}*`,
      thumbnail: message.author.displayAvatarURL({size: 32}),
      fields: fields,
    }));
    
    message.delete();

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
        if (message.embeds.length === 0) return;
        if (message.embeds[0].fields.length === 0) return message.delete();
        if (message.embeds[0].fields[0].name !== 'Word') return message.delete();
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
    return '\n\nExample submission: ```yaml\nword: încotro\ndefinition: whither, where to```\n' +
      'Optionally, you may also add an example to your submission:' + 
      '```yaml\nword: a cunoaște\ndefinition: to know, to recognise\nexample: Îl cunoști?\ntranslation: Do you know him?```';
  }
}