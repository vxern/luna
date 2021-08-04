import { Message, TextChannel } from "discord.js";

import { Client } from "../../../client/client";

import { Moderation } from "../moderation";
import { Command } from "../../command";
import { Ban } from "./ban";

import { Utils } from "../../../utils";

export class Warn extends Command<Moderation> {
  readonly identifier = 'warn';
  readonly aliases = [];
  readonly description = 'Warns a user';
  readonly arguments = ['tag | name | id', 'reason'];
  readonly dependencies = [Ban];
  readonly handler = this.warn;

  async warn(message: Message, dependencies: Map<string, any>) {
    const args = message.content.split(' ');

    message.content = args[0];

    const member = await this.module.resolveMember(message);

    if (member === undefined) {
      return;
    }

    if (!member.bannable) {
      Client.warn(message.channel as TextChannel, 'You do not have the authority to warn this member.');
      return;
    }

    Client.database.fetchDatabaseEntryOrCreate(member.user).then((target) => {
      if (target === undefined) {
        Client.severe(message.channel as TextChannel, `Failed to obtain or create user entry for ${member.user}.`);
        return;
      }

      if (target.user.warnings.size === 2) {
        message.content = `${member.id} -1 Violating the rules on three occasions`;
        dependencies.get('Ban').ban(message);
        return;
      }

      Client.database.update(() => target.user.warnings.set(target.user.warnings.size, args[1]), target);

      Client.warn(message.channel as TextChannel, 
        `**${member.user.tag}** has been warned for: ${args[1]}.\n\n` +
        `**${member.user.tag}** now has ${Utils.pluralise('warning', target.user.warnings.size)}`
      );
    });
  }
}