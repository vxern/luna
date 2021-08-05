import { TextChannel } from "discord.js";

import { Client } from "../../../client/client";

import { Moderation } from "../moderation";
import { Command, HandlingData } from "../../command";

import { Utils } from "../../../utils";

export class Ban extends Command<Moderation> {
  readonly identifier = 'ban';
  readonly aliases = ['suspend'];
  readonly description = 'Bans a user indefinitely';
  readonly parameters = ['identifier', 'optional: days', 'optional: months', 'optional: reason'];
  readonly dependencies = [];
  readonly handler = this.ban;

  async ban({message, parameters}: HandlingData) {
    let days = Utils.resolveNumber(message.channel, parameters.get('days'));
    let months = Utils.resolveNumber(message.channel, parameters.get('months'));
    
    if (days === -1 || months === -1) {
      return;
    }

    const totalDays = days + months;
    
    console.log(totalDays);

    if (totalDays < 1) {
      Client.warn(message.channel as TextChannel, 
        'There is no point in banning somebody for no time.'
      );
      return;
    }

    if (totalDays >= 365) {
      Client.tip(message.channel as TextChannel, 
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

    const monthsString = months > 0 ? Utils.pluralise('month', months) : '';
    const daysString = days > 0 ? Utils.pluralise('day', days) : '';
    const periodString = `${monthsString}${months > 0 && days > 0 ? ' and ' : ''}${daysString}`; 

    const time = totalDays === 0 || totalDays >= 365 ? 
      'indefinitely' : 
      `for ${periodString}`;
    const banReason = reason !== undefined ? 
      `for: ${reason}` : 
      'with no reason given';
    Client.severe(message.channel, `**${member.user.tag}** has been banned ${periodString} ${banReason}.`);
  }
}