import { Message, TextChannel } from "discord.js";

import { Client } from "../../../client/client";

import { Moderation } from "../moderation";
import { Command } from "../../command";

export class Kick extends Command<Moderation> {
  readonly identifier = 'kick';
  readonly aliases = [];
  readonly description = 'Kicks a user from the server';
  readonly arguments = ['tag | name | id', 'optional: reason'];
  readonly dependencies = [];
  readonly handler = this.kick;

  async kick(message: Message) {
    const args = message.content.split(' ');

    message.content = args[0];

    const member = await this.module.resolveMember(message);

    if (member === undefined) {
      return;
    }

    if (!member.kickable) {
      Client.warn(message.channel as TextChannel, 'You do not have the authority to kick this member.');
      return;
    }

    member?.kick(args[1]);

    const kickReason = args[1] !== undefined ? `for: '${args[1]}'` : 'with no reason given';
    Client.severe(message.channel as TextChannel, `${member.user.tag} has been kicked ${kickReason}.`);
  }
}