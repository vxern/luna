import moment from "moment";

import { Client } from "../../../client/client";

import { Warning } from "../../../database/structs/warning";

import { Moderation } from "../moderation";
import { Roles } from "../../roles/roles";
import { Command, HandlingData } from "../../command";

export class Mute extends Command<Moderation> {
  readonly identifier = 'mute';
  readonly aliases = ['silence'];
  readonly description = 'Mutes a user, effectively excluding them from interacting on the server for the duration of the mute.';
  readonly parameters = ['identifier', 'reason', 'duration',];
  readonly dependencies = [];
  readonly handler = this.mute;

  async mute({message, parameters}: HandlingData) {
    const seconds = this.module.resolveTimeQuery(
      message.channel, 
      parameters.get('duration')!,
      ['minute', 'hour', 'day'],
      'second',
    );

    if (seconds === undefined) return;

    const member = await Moderation.resolveMember(message, parameters.get('identifier')!);

    if (member === undefined) return;

    if (!member.bannable) {
      Client.warn(message.channel, 'You do not have the authority to mute this member.');
      return;
    }

    Client.database.fetchOrCreateDocument(member.user).then((document) => {
      if (!!document.user.mute) {
        Client.warn(message.channel, 
          `**${member.user.tag}** is already muted.\n\n` + 
          `Their mute expires ${document.user.mute!.expiresAt.fromNow()}.`);
        return;
      }

      const reason = parameters.get('reason')!;
      const now = moment();
      const expiryTime = now.add(seconds, 'seconds');

      Client.database.muteUser(member, document, new Warning({
        reason: reason,
        expiresAt: expiryTime,
      }));

      Client.severe(message.channel, `**${member.user.tag}** has been muted, and will be unmuted ${expiryTime.fromNow()}.`);
    });
  }
}