import { Client } from "../../../client/client";

import { Moderation } from "../moderation";
import { Command, HandlingData } from "../../command";

import { Utils } from "../../../utils";

export class Unmute extends Command<Moderation> {
  readonly identifier = 'unmute';
  readonly aliases = ['unsilence'];
  readonly description = 'Unmutes a user, allowing them to interact on the server again.';
  readonly parameters = ['identifier'];
  readonly handler = this.unmute;

  async unmute({message, parameter}: HandlingData) {
    const member = await Moderation.resolveMember(message, parameter!);

    if (member === undefined) return;

    if (Utils.isModerator(member)) {
      Client.warn(message.channel, 'You do not have the authority to mute this member.');
      return;
    }

    Client.database.fetchOrCreateDocument(member.user).then((document) => {
      if (!document.user.mute) {
        Client.warn(message.channel, `${Utils.toUserTag(member.id)} is not muted.`);
        return;
      }

      // Hijack the expire callback, and cancel the timeout which was due to execute it
      const [timeout, expire] = Client.database.muteTimeouts.get(member.id)!;
      clearTimeout(timeout);
      expire();

      Client.info(message.channel, `${Utils.toUserTag(member.id)} has been unmuted.`);
    });
  }
}