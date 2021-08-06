import { Client } from "../../../client/client";

import { Moderation } from "../moderation";
import { Command, HandlingData } from "../../command";

import config from '../../../config.json';

export class Ban extends Command<Moderation> {
  readonly identifier = 'ban';
  readonly aliases = ['suspend'];
  readonly description = 'Bans a user for a specified duration of time, or indefinitely otherwise';
  readonly parameters = ['identifier', 'optional: duration', 'optional: reason'];
  readonly dependencies = [];
  readonly handler = this.ban;

  async ban({message, parameters}: HandlingData) {
    const days = parameters.has('duration') ? this.module.resolveTimeQuery(
      message.channel, 
      parameters.get('duration')!,
      ['day', 'week', 'month', 'year'],
      'day',
    ) : 0;
    
    if (days === -1) {
      return;
    }

    if (days >= config.extendBanToPermanenceBeyondYears * 365) {
      Client.tip(message.channel, 
        `The number of days has crossed the mark of a year. For simplicity's sake, the ban will be extended to permanence.`
      );
    }

    const member = await this.module.resolveMember(message, parameters.get('identifier')!);

    if (member === undefined) {
      return;
    }

    if (!member.bannable) {
      Client.warn(message.channel, 'You do not have the authority to ban this member.');
      return;
    }

    const reason = parameters.get('reason');

    Client.database.removeDatabaseEntry(member.user);
    member?.ban({days: Number(days), reason: reason});

    const banReason = reason !== undefined ? 
      `for: ${reason}` : 
      'with no reason given';
    Client.severe(message.channel, `**${member.user.tag}** has been banned ${banReason}.`);
  }
}