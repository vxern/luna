import { Guild, GuildMember, Message, TextChannel, User, Util } from 'discord.js';
import * as string from 'string-sanitizer';

import { Client } from '../../client/client';

import { Module } from '../module';

import { Ban } from './commands/ban';
import { CiteRule } from './commands/cite-rule';
import { Kick } from './commands/kick';
import { Mute } from './commands/mute';
import { Pardon } from './commands/pardon';
import { Unban } from './commands/unban';
import { Unmute } from './commands/unmute';
import { Warn } from './commands/warn';

import roles from '../../roles.json';

import { Utils } from '../../utils';

const userTag = /<@!?.+>/;
const fullTag = /.+#\d{4}/;

export class Moderation extends Module {
  readonly requirement = (message: Message) => message.member?.roles.cache.map((role) => role.name).includes(Utils.capitaliseWords(roles.moderator)) || false;
  readonly commandsRestricted = Utils.instantiate([Ban, Kick, Mute, Pardon, Unban, Unmute, Warn], [this]);
  readonly commandUnrestricted = Utils.instantiate([CiteRule], [this]);

  /// Takes an identifier in the form of a full tag, a username or an ID and
  /// finds the member bearing it
  async resolveMember(message: Message): Promise<GuildMember | undefined> {
    const members = await message.guild!.members.fetch();

    // If the identifier is a tag, convert it to an ID
    if (userTag.test(message.content)) {
      message.content = Utils.extractNumbers(message.content)[0];
    }

    // If the identifier is an ID
    if (Utils.isNumber(message.content)) {
      return members.find((member) => member.id === message.content);
    }

    // If the username is a valid tag ( a username with a discriminator )
    if (fullTag.test(message.content)) {
      return members.find((member) => member.user.tag === message.content);
    }

    const membersFound = members.filter((member) => Utils.includes(member.user.username + member.displayName, message.content));

    if (membersFound.size === 0) {
      Client.warn(message.channel as TextChannel, `No member with the username '${message.content}' found.`);
      return;
    }

    const member = await this.browse(
      message, Array.from(membersFound.values()), (member) => `${member.user.tag}, ID \`${member.user.id}\``
    );

    return member;
  }

  /// Takes an identifier in the form of an ID, a full tag or a username
  /// and finds the banned user bearing it
  async resolveBannedUser(message: Message): Promise<{user: User, reason: string} | undefined> {
    const bans = Array.from((await message.guild!.fetchBans()).values());

    // If the identifier is an ID
    if (Utils.isNumber(message.content)) {
      return bans.find((data) => data.user.id === message.content);
    }

    // If the username is a valid tag ( a username with a discrimination )
    if (fullTag.test(message.content)) {
      return bans.find((data) => data.user.tag === message.content);
    }

    const usersFound = bans.filter((ban) => Utils.includes(ban.user.username, message.content));

    if (usersFound.length === 0) {
      Client.warn(message.channel as TextChannel, `No banned users with the username '${message.content}' found.`);
      return;
    }

    const user = await this.browse(
      message, 
      usersFound, 
      (data) => `${data.user.tag} ~ banned for: ${this.findBanReason(bans.map((ban) => ban.user), data)}`
    );

    return user;
  }

  /// Returns the ban reason or attempts to synthesise it if one does not exist
  findBanReason(bannedUsers: User[], data: {user: User, reason: string | null}) {
    if (data.reason !== null) return data.reason;

    const bannedUsersWithSimilarName = bannedUsers.filter(
      (user) => Utils.areSimilar(user.username, data.user.username)
    ).length;

    if (bannedUsersWithSimilarName > 5) {
      return 'Large number of duplicate accounts';
    }

    if (bannedUsersWithSimilarName > 1) {
      return 'Duplicate account';
    }

    return 'No reason found.';
  }

  async isMemberBanned(member: GuildMember) {
    const bans = await member?.guild.fetchBans();
    return Array.from(bans?.keys()).includes(member.id);
  }

  async fetchBannedUsers(guild: Guild) {
    return (await guild.fetchBans()).map((banObject) => banObject.user);
  }
}