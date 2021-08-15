import { EmbedField } from "discord.js";

import { Client } from "../../../client/client";
import { Embed } from "../../../client/embed";

import { Roles } from "../roles";
import { Command, HandlingData } from "../../command";

import { Utils } from "../../../utils";

import roles from '../../../roles.json';

export class Assignable extends Command<Roles> {
  readonly identifier = 'roles';
  readonly aliases = ['role', 'rolelist', 'assignable'];
  readonly description = 'Displays a list of assignable roles.';
  readonly parameters = [];
  readonly dependencies = [];
  readonly handler = this.displayAssignableRoles;

  async displayAssignableRoles({message}: HandlingData) {
    const relevantRoles = Roles.getRelevantRoleCategories(message.member!);

    const fields = relevantRoles.map(([category, roles]: [string, string[]]) => {return {
      name: Utils.capitaliseWords(category),
      value: roles.map((roleName) => Utils.toRoleTag(
        Roles.findRole(message.member!, roleName).id)
      ).join(' '),
      inline: true,
    }});

    Client.send(message.channel, new Embed({fields: fields}));
  }
}