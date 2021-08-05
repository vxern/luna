import { EmbedField } from "discord.js";

import { Client } from "../../../client/client";
import { Embed } from "../../../client/embed";

import { Roles } from "../roles";
import { Command, HandlingData } from "../../command";

import { Utils } from "../../../utils";

import roles from '../../../roles.json';

export class Assignable extends Command<Roles> {
  readonly identifier = 'roles';
  readonly aliases = ['role', 'rolelist'];
  readonly description = 'Displays a list of assignable roles';
  readonly parameters = [];
  readonly dependencies = [];
  readonly handler = this.displayAssignableRoles;

  async displayAssignableRoles({message}: HandlingData) {
    const roleCategoriesToDisplay = Object.entries(roles).slice(3, Roles.hasProficiency(message.member!) ? undefined : 3);
      
    const fields = roleCategoriesToDisplay.map<EmbedField>(([key, value]) => {return {
      name: Utils.capitaliseWords(key),
      value: (value as string[]).map((roleName) => Roles.toTag(
        Roles.findRole(message.member!, roleName).id)
      ).join(' '),
      inline: true,
    }});

    Client.send(message.channel, new Embed({fields: fields}));
  }
}