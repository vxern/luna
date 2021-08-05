import { Client } from "../../../client/client";

import { Moderation } from "../moderation";
import { Command, HandlingData } from "../../command";

import { Utils } from "../../../utils";

export class Pardon extends Command<Moderation> {
  readonly identifier = 'pardon';
  readonly aliases = [];
  readonly description = `Pardons a user by removing a warning they've received`;
  readonly parameters = ['identifier', 'id'];
  readonly dependencies = [];
  readonly handler = this.pardon;

  async pardon({message, parameters}: HandlingData) {
    const member = await this.module.resolveMember(message, parameters.get('identifier')!);

    if (member === undefined) {
      return;
    }

    if (!member.bannable) {
      Client.warn(message.channel, 'You do not have the authority to pardon this member.');
      return;
    }

    Client.database.fetchDatabaseEntryOrCreate(member.user).then((target) => {
      if (target === undefined) {
        return;
      }

      const numberOfWarnings = Object.keys(target.user.warnings).length - 1;

      if (numberOfWarnings === -1) {
        Client.warn(message.channel, `${member.user.tag} has no warnings, and thus it is not possible to pardon them.`);
        return;
      }

      const warningId = parameters.get('id')!;

      if (!Utils.isNumber(warningId)) {
        Client.warn(message.channel, 'A warning ID must be a number.');
        return;
      }

      if (!Object.keys(target.user.warnings).includes(warningId)) {
        Client.warn(message.channel, `${member.user.tag} does not have a warning with an ID of ${warningId}.`);
        return;
      }

      const warningMessage = target.user.warnings[warningId][0];

      target.user.warnings[warningId] = null;

      Client.database.stage(target, true);

      Client.info(message.channel, 
        `**${member.user.tag}** has been pardoned from warning no. ${warningId}: ${warningMessage}\n\n` +
        `**${member.user.tag}** now has ${Utils.pluralise('warning', numberOfWarnings)}.`
      );
    });
  }
}