import { Guild, GuildMember, Message, TextChannel, User } from 'discord.js';

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

const userTag = /<@!?.+>/g;
const usernameWithDiscriminator = /.+#\d{4}/g;

export class Moderation extends Module {
  readonly requirement = (message: Message) => message.member?.roles.cache.map((role) => role.name).includes(Utils.capitaliseWords(roles.moderator)) || false;
  readonly commandsRestricted = Utils.instantiate([Ban, Kick, Mute, Pardon, Unban, Unmute, Warn], [this]);
  readonly commandUnrestricted = Utils.instantiate([CiteRule], [this]);

  /// TODO: Fix this function of doom once and for all
  ///
  /// Takes an identifier in the form of a tag, a username or an ID
  async resolve(type: 'GuildMember' | 'User', message: Message): Promise<GuildMember | User | undefined> {
    const collection: (GuildMember | User)[] = type === 'User' ? 
      Array.from(((await message.guild!.fetchBans()).mapValues((banData) => banData.user)).values()) : 
      Array.from((await message.guild!.members.fetch()).values());

    function getUser(member: GuildMember | User): User {
      if (member instanceof GuildMember) return member.user;

      return member;
    }

    // If the identifier is a tag, convert it to an ID
    if (userTag.test(message.content)) {
      message.content = Utils.extractNumbers(message.content)[0].toString();
    }

    // If the identifier is an ID
    if (Utils.isNumber(message.content)) {
      return collection.find((member) => member.id === message.content);
    }

    // If the username contains a discriminator ( a 4-digit number seen in a tag )
    if (usernameWithDiscriminator.test(message.content)) {
      return collection.find((member) => getUser(member).tag === message.content);
    }

    const usernameLowercase = message.content.toLowerCase();
    const membersFound = collection.filter(
      (member) => getUser(member).username.toLowerCase().includes(usernameLowercase)
    );
    console.log(membersFound.length);
    console.log(collection.map((member) => getUser(member).username).filter((username) => username.includes(usernameLowercase)));
    
    if (membersFound.length === 0) {
      Client.warn(message.channel as TextChannel, `No member with the username '${usernameLowercase}' found.`);
      return;
    }

    const member = await this.browse(
      message, Array.from(membersFound.values()), (member) => `${getUser(member).tag}, ID \`${getUser(member).id}\``
    );

    return member;
  }

  async isMemberBanned(member: GuildMember) {
    const bans = await member?.guild.fetchBans();
    return Array.from(bans?.keys()).includes(member.id);
  }

  async fetchBannedUsers(guild: Guild) {
    return (await guild.fetchBans()).map((banObject) => banObject.user);
  }
}