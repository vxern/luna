import { Message, TextChannel, User } from "discord.js";

import { Moderation } from "../moderation";
import { Command } from "../../command";
import { Client } from "../../../client/client";

export class Unban extends Command<Moderation> {
  readonly identifier = 'unban';
  readonly aliases = ['unsuspend'];
  readonly description = 'Unbans a previously indefinitely banned user';
  readonly arguments = ['tag | name | id'];
  readonly dependencies = [];
  readonly handler = this.unban;

  async unban(message: Message) {
    const banData = await this.module.resolveBannedUser(message);

    if (banData === undefined) {
      return;
    }

    message.guild!.members.unban(banData.user);
   
    Client.info(message.channel as TextChannel, `${banData.user.tag} has been unbanned.`);
  }
}