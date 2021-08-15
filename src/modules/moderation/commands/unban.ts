import { Client } from "../../../client/client";

import { Moderation } from "../moderation";
import { Command, HandlingData } from "../../command";

export class Unban extends Command<Moderation> {
  readonly identifier = 'unban';
  readonly aliases = ['unsuspend'];
  readonly description = 'Unbans a user who has been previously banned indefinitely.';
  readonly parameters = ['identifier'];
  readonly dependencies = [];
  readonly handler = this.unban;

  async unban({message, parameter}: HandlingData) {
    const banData = await Moderation.resolveBannedUser(message, parameter!);

    if (banData === undefined) return;

    message.guild!.members.unban(banData.user);
   
    Client.info(message.channel, `**${banData.user.tag}** has been unbanned.`);
  }
}