import { Client } from "../../../client/client";

import { Moderation } from "../moderation";
import { Command, HandlingData } from "../../command";

import config from '../../../config.json';
import { Utils } from "../../../utils";

export class Ban extends Command<Moderation> {
  readonly identifier = 'ban';
  readonly aliases = ['suspend'];
  readonly description = `Bans a user indefinitely and optionally deletes the user's message history up to 7 days`;
  readonly parameters = ['identifier', 'optional: days', 'optional: reason'];
  readonly dependencies = [];
  readonly handler = this.ban;

  async ban({message, parameters}: HandlingData) {
    let days = Utils.resolveNumber(message.channel, parameters.get('days'));
    
    if (days === null) days = undefined;

    if (days !== undefined) {
      if (days < 1) {
        Client.warn(message.channel, 'The number of days of message history to delete must not be lesser than 1.');
        return;
      }

      if (days > 7) {
        Client.warn(message.channel, 'The number of days of message history to delete must not be greater than 7.');
        return;
      }
    }

    const member = await this.module.resolveMember(message, parameters.get('identifier')!);

    if (member === undefined) return;

    if (!member.bannable) {
      Client.warn(message.channel, 'You do not have the authority to ban this member.');
      return;
    }

    const reason = parameters.get('reason');

    Client.database.deleteDocument(member.user);
    member?.ban({days: days, reason: reason});

    const banReason = reason !== undefined ? 
      `for: ${reason}` : 
      'with no reason given';
    Client.severe(message.channel, `**${member.user.tag}** has been banned indefinitely ${banReason}.`);
  }
}