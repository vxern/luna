import { Client } from "../../../client/client";
import { Embed } from "../../../client/embed";

import { Moderation } from "../moderation";
import { Command, HandlingData } from "../../command";

import { Utils } from "../../../utils";

import rules from "../../../rules.json";

export class CiteRule extends Command<Moderation> {
  readonly identifier = 'rule';
  readonly aliases = ['rules', 'cite', 'cite rule'];
  readonly description = 'Cites a rule';
  readonly parameters = ['number'];
  readonly dependencies = [];
  readonly handler = this.citeRule;

  async citeRule({message, parameter}: HandlingData) {
    if (!Utils.isNumber(parameter)) {
      Client.warn(message.channel, 'The rule __number__ must be a __number__.');
      return;
    }

    const index = Number(parameter);

    const easterEggRule = new Map(Object.entries(rules.easterEggs)).get(index.toString());

    if (index === rules.rules.length + 1) {
      Client.severe(message.channel, `${message.author.username} has been banned indefinitely.`);
      return;
    }

    if (easterEggRule !== undefined) {
      if (index >= 100) {
        Client.send(message.channel, new Embed({
          message: `**${easterEggRule}**`
        }));
        return;
      }

      Client.send(message.channel, new Embed({
        title: `Principal no. ${index} of the Internet`,
        message: easterEggRule
      }));
      return;
    }

    if (!Utils.isIndexInBounds(message.channel, index, rules.rules.length)) {
      return;
    }

    const rule = rules.rules[index - 1];

    Client.send(message.channel, new Embed({
      title: rule[0],
      message: rule[1].replace('{length}', (rules.rules.length - 1).toString())
    }));
  }
}