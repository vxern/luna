import { TextChannel } from "discord.js";

import { Client } from "../../../client/client";

import { Moderation } from "../moderation";
import { Command, HandlingData } from "../../command";

import { Utils } from "../../../utils";

export class Kick extends Command<Moderation> {
  readonly identifier = 'kick';
  readonly aliases = ['exclude'];
  readonly description = 'Kicks a user from the server.';
  readonly parameters = ['identifier', 'optional: reason'];
  readonly dependencies = [];
  readonly handler = this.kick;

  async kick({message, parameters}: HandlingData) {
    const member = await Moderation.resolveMember(message, parameters.get('identifier')!);

    if (member === undefined) return;

    if (Utils.isModerator(member)) {
      Client.warn(message.channel as TextChannel, 'You do not have the authority to kick this member.');
      return;
    }

    const reason = parameters.get('reason');

    member.kick(reason);

    const kickReason = reason !== undefined ? `for: ${reason}` : 'with no reason given';
    Client.severe(message.channel as TextChannel, `${Utils.toUserTag(member.id)} has been kicked ${kickReason}.`);
  }
}