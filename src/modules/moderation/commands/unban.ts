import { Message, TextChannel, User } from "discord.js";

import { Moderation } from "../moderation";
import { Command } from "../../command";
import { Client } from "../../../client/client";

export class Unban extends Command<Moderation> {
  readonly identifier = 'unban';
  readonly aliases = ['unsuspend'];
  readonly description = 'Unbans a previously indefinitely banned user';
  readonly arguments = ['tag | name | id', 'optional: reason'];
  readonly dependencies = [];
  readonly handler = this.unban;

  async unban(message: Message) {
    const args = message.content.split(' ');

    message.content = args[0];

    const user = await this.module.resolve('User', message) as User | undefined;

    if (user === undefined) {
      return;
    }

    message.guild?.members.unban(user, args[1]);
   
    Client.info(message.channel as TextChannel, `${user.tag} has been unbanned.`);
  }
}