import moment from "moment";

import { Client, GuildMessage } from "../../../client/client";

import { Service } from "../../service";

import { Moderation } from "../moderation";

import moderation from '../../../moderation.json';
import { Utils } from "../../../utils";

export class AntiFlood extends Service<Moderation> {
  // Stores newly posted messages and their authors
  private readonly messageAccumulator: Map<string, GuildMessage[]> = new Map();
  
  private readonly warnedForFlooding: Map<string, number> = new Map();

  async initialise() {
    Client.bot.client.on('message', (message) => {
      if (message.channel.type !== 'text') return;
      if (Utils.isModerator(message.member!)) return;

      this.detectAbuse(message as GuildMessage);
    });
  }

  async detectAbuse(message: GuildMessage) {
    if (!this.messageAccumulator.has(message.author.id)) {
      return this.messageAccumulator.set(message.author.id, [message]);
    }

    const accumulatedMessages = this.messageAccumulator.get(message.author.id)!;

    accumulatedMessages.push(message);

    // Remove those messages whise creation dates do not fall inside
    // the flood interval
    const messagesInInterval = accumulatedMessages.filter((message) => {
      const createdAt = moment(message.createdTimestamp);
      const elapsedSeconds = moment().diff(createdAt, 'seconds');
      return elapsedSeconds <= moderation.flooding.intervalInSeconds;
    })

    // TODO: This should ideally be based on the user's trust level
    if (messagesInInterval.length >= moderation.flooding.messagesToTrigger) {
      this.triggerFlooding(message, accumulatedMessages);
    }
  }

  async triggerFlooding(message: GuildMessage, accumulatedMessages: GuildMessage[]) {
    const previousWarnings = this.warnedForFlooding.get(message.author.id) ?? 0;

    Client.warn(
      message.channel, 
      `Take a moment to cool off, ${Utils.toUserTag(message.author.id)}, ` + 
      `will you? (${moderation.flooding.warningMuteDurations[previousWarnings]})`
    ).then((warning) => {
      warning?.delete({
        timeout: moderation.flooding.autodelete.warningInSeconds * (previousWarnings * 2 + 1) * 1000
      });
    })

    switch (previousWarnings) {
      case 0:
        Client.commands.get('Mute').mute({
          message: message, 
          parameters: new Map([
            ['identifier', message.author.id],
            ['reason', `Flooding the chat.`],
            ['duration', moderation.flooding.warningMuteDurations[previousWarnings]],
          ]),
          quiet: true,
        });
        break;
      case moderation.flooding.warningMuteDurations.length - 1:
        this.warnedForFlooding.delete(message.author.id);
        return Client.commands.get('Ban').ban({
          message: message, 
          parameters: new Map([
            ['identifier', message.author.id],
            ['reason', 
              'Flooding the chat and ignoring the ' + 
              `${Utils.pluralise('warning', moderation.flooding.warningMuteDurations.length)} given.`
            ],
            ['days', '1'],
          ]),
        });
      default:
        if (previousWarnings >= moderation.flooding.autodelete.messages.afterWarnings) {
          this.messageAccumulator.set(message.author.id, []);
          for (let i = 0; i < accumulatedMessages.length; i++) {
            accumulatedMessages[i].delete();
          }
        }

        Client.commands.get('Mute').mute({
          message: message, 
          parameters: new Map([
            ['identifier', message.author.id],
            ['reason', `Flooding the chat and ignoring the ${Utils.toOrdinal(previousWarnings)} warning given.`],
            ['duration', moderation.flooding.warningMuteDurations[previousWarnings]],
          ]),
          quiet: true,
        });
        break;
    }

    this.warnedForFlooding.set(message.author.id, previousWarnings + 1);
  }
}