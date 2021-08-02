import { Message, TextChannel } from "discord.js";

import { Client } from "../../../client/client";
import { Embed } from "../../../client/embed";

import { Moderation } from "../moderation";
import { Command } from "../../command";

import { Utils } from "../../../utils";

import rules from "../../../rules.json";

export class CiteRule extends Command<Moderation> {
  readonly identifier = 'rule';
  readonly aliases = ['rules', 'cite'];
  readonly description = 'Cites a rule';
  readonly arguments = ['rule number'];
  readonly dependencies = [];
  readonly handler = this.citeRule;

  async citeRule(message: Message) {
    if (!Utils.isNumber(message.content)) {
      Client.warn(message.channel as TextChannel, 'The rule __number__ must be a __number__');
      return;
    }

    const index = Number(message.content);

    if (!Utils.isIndexInBounds(message.channel as TextChannel, index, rules.rules.length)) {
      return;
    }

    if (index === 12) {
      Client.error(message.channel as TextChannel, `${message.author.username} has been banned indefinitely.`);
      return;
    }

    const rule = rules.rules[index - 1];

    Client.send(message.channel as TextChannel, new Embed({
      title: rule[0],
      message: rule[1]
    }));    
  }
}