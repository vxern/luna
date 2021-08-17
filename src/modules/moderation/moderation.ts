import { Guild, GuildMember, User } from 'discord.js';

import { Client, GuildMessage } from '../../client/client';

import { Module } from '../module';

import { Ban } from './commands/ban';
import { CiteRule } from './commands/cite-rule';
import { Kick } from './commands/kick';
import { Mute } from './commands/mute';
import { Pardon } from './commands/pardon';
import { Purge } from './commands/purge';
import { Unban } from './commands/unban';
import { Unmute } from './commands/unmute';
import { Warn } from './commands/warn';

import { AntiFlood } from './services/anti-flood';

import { Utils } from '../../utils';

const userTag = /<@!?.+>/;
const fullTag = /.+#\d{4}/;

export interface BannedUser {
  user: User,
  reason: string,
}

export class Moderation extends Module {
  readonly requirement = (message: GuildMessage) => Utils.isModerator(message.member!);
  readonly commandsRestricted = Utils.instantiate([Ban, Kick, Mute, Pardon, Purge, Unban, Unmute, Warn], [this]);
  readonly commandsUnrestricted = Utils.instantiate([CiteRule], [this]);
  readonly services = Utils.instantiate([AntiFlood], [this]);

  /// Takes an identifier in the form of a full tag, a username or an ID and
  /// finds the member bearing it
  static async resolveMember(message: GuildMessage | undefined, parameter: string): Promise<GuildMember | undefined> {
    const members = await (message !== undefined ? message.guild!.members.fetch() : Client.getMembers());

    // If the identifier is a tag, convert it to an ID
    if (userTag.test(parameter)) {
      parameter = Utils.extractNumbers(parameter)[0];
    }

    let member: GuildMember | undefined | null = null;

    // If the identifier is an ID
    if (Utils.isNumber(parameter)) {
      member = members.find((member) => member.id === parameter);
    }

    // If the username is a valid tag ( a username with a discriminator )
    if (fullTag.test(parameter)) {
      member = members.find((member) => member.user.tag === parameter);
    }

    if (!!member) return member;

    if (message === undefined) return;

    if (member === undefined) {
      Client.warn(message.channel, `**${parameter}** is not a member of ${message.guild?.name}.`);
      return;
    }

    const membersFound = members.filter((member) => Utils.includes(member.user.tag + member.displayName, parameter));

    if (membersFound.size === 0) {
      Client.warn(message.channel, `No members with the username '${parameter}' found.`);
      return;
    }

    member = await Module.browse(
      message, Array.from(membersFound.values()), (member) => `${member!.user.tag}, ID \`${member!.user.id}\``
    );

    return member;
  }

  /// Takes an identifier in the form of an ID, a full tag or a username
  /// and finds the banned user bearing it
  static async resolveBannedUser(message: GuildMessage, parameter: string): Promise<BannedUser | undefined> {
    const bans = Array.from((await message.guild!.fetchBans()).values());

    parameter = parameter.toLowerCase();

    // If the identifier is an ID
    if (Utils.isNumber(parameter)) {
      return bans.find((data) => data.user.id === parameter);
    }

    // If the username is a valid tag ( a username with a discrimination )
    if (fullTag.test(parameter)) {
      return bans.find((data) => data.user.tag === parameter);
    }

    const usersFound = bans.filter((ban) => Utils.includes(ban.user.tag, parameter));

    if (usersFound.length === 0) {
      Client.warn(message.channel, `No banned users with the username '${parameter}' found.`);
      return;
    }

    const bannedUser = await Module.browse(
      message, 
      usersFound, 
      (data) => `${data.user.tag} ~ banned for: ${this.findBanReason(bans.map((ban) => ban.user), data)}`
    );

    return bannedUser;
  }

  /// Returns the ban reason or attempts to synthesise it if one does not exist
  static findBanReason(bannedUsers: User[], data: BannedUser) {
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
    const bans = await member.guild.fetchBans();
    return Array.from(bans.keys()).includes(member.id);
  }

  async fetchBannedUsers(guild: Guild) {
    return (await guild.fetchBans()).map((banObject) => banObject.user);
  }
}