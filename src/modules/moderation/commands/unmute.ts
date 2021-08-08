import { Client } from "../../../client/client";

import { Moderation } from "../moderation";
import { Command, HandlingData } from "../../command";

export class Unmute extends Command<Moderation> {
  readonly identifier = 'unmute';
  readonly aliases = ['unsilence'];
  readonly description = 'Unmutes a user, allowing them access to the server again';
  readonly parameters = ['identifier'];
  readonly dependencies = [];
  readonly handler = this.unmute;

  async unmute({message, parameter}: HandlingData) {
    const member = await Moderation.resolveMember(message, parameter!);

    if (member === undefined) return;

    if (!member.bannable) {
      Client.warn(message.channel, 'You do not have the authority to mute this member.');
      return;
    }

    Client.database.fetchOrCreateDocument(member.user).then((document) => {
      if (!document.user.mute) {
        Client.warn(message.channel, `**${member.user.tag}** is not muted.`);
        return;
      }

      // Hijack the expire callback, and cancel the timeout which was due to execute it
      const [timeout, expire] = Client.database.muteTimeouts.get(member.user.id)!;
      clearTimeout(timeout);
      expire();

      Client.tip(message.channel, `**${member.user.tag}** has been unmuted.`);
    });
  }
}