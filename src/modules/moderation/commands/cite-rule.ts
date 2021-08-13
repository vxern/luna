import { Client } from "../../../client/client";
import { Embed } from "../../../client/embed";

import { Moderation } from "../moderation";
import { Command, HandlingData } from "../../command";

import { Utils } from "../../../utils";

import rules from "../../../rules.json";

export class CiteRule extends Command<Moderation> {
  readonly identifier = 'rule';
  readonly aliases = ['rules', 'cite'];
  readonly description = 'Cites a rule';
  readonly parameters = ['rule'];
  readonly dependencies = [];
  readonly handler = this.citeRule;

  async citeRule({message, parameter}: HandlingData) {
    if (!Utils.isNumber(parameter)) {
      Client.warn(message.channel, 'The rule __number__ must be a __number__.');
      return;
    }

    const index = Number(parameter);

    if (index < 1) {
      Client.warn(message.channel, 'The rule number cannot be zero or negative.');
      return;
    }
    
    const easterEggRules = Object.entries(rules.easterEggs);
    const easterEggRule = new Map(easterEggRules).get(parameter!);

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

    if (index > rules.rules.length) {
      const easterEggIndexes = easterEggRules.map(([index]) => Number(index));
      const isCloserToRulesThanEasterEggs = Math.abs(index - easterEggIndexes[0]) < Math.abs(index - rules.rules.length);
      const closestIndex =
        isCloserToRulesThanEasterEggs ?
        easterEggIndexes.reduce((a, b) => Math.abs(index - a) < Math.abs(index - b) ? a : b) : 
        rules.rules.length - 1;

      Client.warn(message.channel, `Rule no. ${index} does not exist. Have you tried citing rule no. ${closestIndex}?`);
      return;
    }

    const rule = rules.rules[index - 1];

    Client.send(message.channel, new Embed({
      title: rule[0],
      message: rule[1].replace('{length}', (rules.rules.length - 1).toString())
    }));
  }
}