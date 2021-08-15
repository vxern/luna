import { Client, GuildMessage } from "../../../client/client";
import { Embed } from "../../../client/embed";

import { Praise as DatabasePraise } from '../../../database/structs/praise';

import { Moderation } from "../../moderation/moderation";
import { Social } from "../social";
import { Command, HandlingData } from "../../command";

import { Utils } from "../../../utils";

import config from '../../../config.json';
import moment from "moment";
import { GuildMember } from "discord.js";
import { Roles } from "../../roles/roles";
import { Document } from "../../../database/structs/document";

export class Profile extends Command<Social> {
  readonly identifier = 'profile';
  readonly aliases = [];
  readonly description = 'Displays useful information about the user.';
  readonly parameters = [];
  readonly dependencies = [];
  readonly handler = this.thank;

  async thank({message}: HandlingData) {
    const member = message.member!;

    const document = await Client.database.fetchOrCreateDocument(member.user);

    const createdAt = moment(member.user.createdAt);
    const joinedAt = moment(member.joinedAt);

    Client.send(message.channel, new Embed({
      title: member.user.username,
      thumbnail: member.user.displayAvatarURL(),
      fields: [{
        name: 'Roles',
        value: member.roles.cache
          .filter((role) => !role.name.startsWith('@'))
          .map((role) => Utils.toRoleTag(role.id))
          .join(' '),
        inline: false,
      }, {
        name: 'Created Account',
        value: `${createdAt.format('Do of MMMM YYYY')} (${createdAt.fromNow()})`,
        inline: true,
      }, {
        name: 'Joined Server',
        value: `${joinedAt.format('Do of MMMM YYYY')} (${joinedAt.fromNow()})`,
        inline: true,
      }, {
        name: 'Statistics',
        value: this.displayStatistics(document),
        inline: false,
      }]
    }));
  }

  displayStatistics(document: Document): string {
    return `
    ⭐ ${Utils.capitaliseWords(Utils.pluralise('praise', document.user.praises.length))}
    ❕ ${Utils.capitaliseWords(Utils.pluralise('warning', document.user.warnings.length))}
    `;
  }
}