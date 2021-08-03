import { Guild, GuildMember, Message, TextChannel } from 'discord.js';

import { Client } from '../../client/client';

import { Module } from '../module';

import { Utils } from '../../utils';

import { Ban } from './commands/ban';
import { CiteRule } from './commands/cite-rule';
import { Kick } from './commands/kick';
import { Mute } from './commands/mute';
import { Pardon } from './commands/pardon';
import { Unban } from './commands/unban';
import { Unmute } from './commands/unmute';
import { Warn } from './commands/warn';

import roles from '../../roles.json';

const userTag = /<@!?.+>/g;
const usernameWithDiscriminator = /.+#\d{4}/g;

export class Moderation extends Module {
  readonly requirement = (message: Message) => message.member?.roles.cache.map((role) => role.name).includes(Utils.capitaliseWords(roles.moderator)) || false;
  readonly commandsRestricted = Utils.instantiate([Ban, Kick, Mute, Pardon, Unban, Unmute, Warn], [this]);
  readonly commandUnrestricted = Utils.instantiate([CiteRule], [this]);

  /// Takes an identifier in the form of a tag, a username or an ID
  async resolveMember(message: Message): Promise<GuildMember | undefined> {
    const members = await message.guild!.members.fetch();

    // If the identifier is a tag, convert it to an ID
    if (userTag.test(message.content)) {
      message.content = Utils.extractNumbers(message.content)[0].toString();
    }

    // If the identifier is an ID
    if (Utils.isNumber(message.content)) {
      return members.find((member) => member.id === message.content);
    }

    // If the character at 
    if (usernameWithDiscriminator.test(message.content)) {
      return members.find((member) => member.user.tag === message.content);
    }

    const usernameLowercase = message.content.toLowerCase();
    const membersFound = members.filter((member) => member.user.username.toLowerCase().includes(usernameLowercase));

    if (membersFound === undefined) {
      Client.warn(message.channel as TextChannel, `No user with the username '${usernameLowercase}' found`);
      return;
    }

    const member = await this.browse(
      message, Array.from(membersFound.values()), (member) => `${member.user.tag}, ID \`${member.user.id}\``
    );

    return member;
  }
}