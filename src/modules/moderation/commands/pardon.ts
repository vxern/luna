import { Client } from "../../../client/client";

import { Moderation } from "../moderation";
import { Command, HandlingData } from "../../command";

import { Utils } from "../../../utils";

export class Pardon extends Command<Moderation> {
  readonly identifier = 'pardon';
  readonly aliases = ['unwarn'];
  readonly description = `Pardons a user by removing a warning they've previously received.`;
  readonly parameters = ['identifier', 'id'];
  readonly handler = this.pardon;

  async pardon({message, parameters}: HandlingData) {
    const member = await Moderation.resolveMember(message, parameters.get('identifier')!);

    if (member === undefined) return;

    if (Utils.isModerator(member)) {
      Client.warn(message.channel, `You do not have the authority to pardon ${Utils.toUserTag(member.id)}.`);
      return;
    }

    Client.database.fetchOrCreateDocument(member.user).then((document) => {
      if (document === undefined) return;

      if (document.user.warnings.length === 0) {
        Client.warn(message.channel, `${Utils.toUserTag(member.id)} has no warnings, and thus it is not possible to pardon them.`);
        return;
      }

      const warningId = Number(parameters.get('id')!);

      if (isNaN(warningId)) {
        Client.warn(message.channel, 'A warning ID must be a number.');
        return;
      }

      if (!Utils.isIndexInBounds(message.channel, warningId, document.user.warnings.length)) {
        return;
      }

      const reason = document.user.warnings[warningId - 1]!.reason;
      document.user.warnings[warningId - 1] = null;

      Client.database.update(document);

      Client.info(message.channel, 
        `${Utils.toUserTag(member.id)} has been pardoned from warning no. ${warningId}: ${reason}\n\n` +
        `${Utils.toUserTag(member.id)} now has ${Utils.pluralise('warning', document.user.warnings.length)}.`
      );
    });
  }
}