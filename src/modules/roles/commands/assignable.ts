import { EmbedField, Message, TextChannel } from "discord.js";

import { Client } from "../../../client/client";
import { Embed } from "../../../client/embed";

import { Roles } from "../roles";
import { Command } from "../../command";

import { Utils } from "../../../utils";

import roles from '../../../roles.json';

export class Assignable extends Command<Roles> {
  readonly identifier = 'roles';
  readonly aliases = ['rolelist'];
  readonly description = 'Displays a list of assignable roles';
  readonly arguments = [];
  readonly dependencies = [];
  readonly handler = this.displayAssignableRoles;

  async displayAssignableRoles(message: Message) {
    const roleCategoriesToDisplay = Object.entries(roles)
      .slice(2, Roles.hasProficiency(message.member!) ? undefined : 2);
      
    const fields = roleCategoriesToDisplay.map<EmbedField>(([key, value]) => {return {
      name: Utils.capitaliseWords(key),
      value: (value as string[]).map((roleName) => Roles.toTag(
        Roles.findRole(message.member!, roleName).id)
      ).join(' '),
      inline: true,
    }});

    Client.send(message.channel as TextChannel, new Embed({fields: fields}));
  }
}