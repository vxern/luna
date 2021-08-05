
import moment from "moment";

import { Client } from "../../../client/client";

import { Moderation } from "../moderation";
import { Command, HandlingData } from "../../command";
import { Ban } from "./ban";

import { Utils } from "../../../utils";

export class Warn extends Command<Moderation> {
  readonly identifier = 'warn';
  readonly aliases = [];
  readonly description = 'Warns a user';
  readonly parameters = ['identifier', 'reason'];
  readonly dependencies = [Ban];
  readonly handler = this.warn;

  async warn({message, dependencies, parameters}: HandlingData) {
    const member = await this.module.resolveMember(message, parameters.get('identifier')!);

    if (member === undefined) {
      return;
    }

    if (!member.bannable) {
      Client.warn(message.channel, 'You do not have the authority to warn this member.');
      return;
    }

    Client.database.fetchDatabaseEntryOrCreate(message.channel, member.user).then((target) => {
      if (target === undefined) {
        return;
      }

      const numberOfWarnings = Object.keys(target.user.warnings).length + 1;

      if (numberOfWarnings === 3) {
        dependencies.get('Ban').ban({
          message: message,
          parameters: new Map([
            ['identifier', member.id],
            ['reason', 'Violating the rules on three occasions']
          ]),
        });
        return;
      }

      const reason = parameters.get('reason')!;

      target.user.warnings[numberOfWarnings] = [reason, moment().unix()];

      Client.database.update(target);

      Client.warn(message.channel, 
        `**${member.user.tag}** has been warned for: ${reason}\n\n` +
        `**${member.user.tag}** now has ${Utils.pluralise('warning', numberOfWarnings)}`
      );
    });
  }
}