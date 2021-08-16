import moment from "moment";

import { Client } from "../../../client/client";
import { Embed } from "../../../client/embed";

import { Document } from "../../../database/structs/document";

import { Command, HandlingData } from "../../command";

import { Social } from "../social";

import { Utils } from "../../../utils";

export class Profile extends Command<Social> {
  readonly identifier = 'profile';
  readonly aliases = [];
  readonly description = 'Displays useful information about the user.';
  readonly parameters = [];
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