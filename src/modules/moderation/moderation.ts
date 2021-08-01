import { Message } from 'discord.js';

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

export class Moderation extends Module {
  readonly requirement = (message: Message) => message.member?.roles.cache.map((role) => role.name).includes(Utils.capitaliseWords(roles.moderator)) || false;
  readonly commands = Utils.instantiated([Ban, CiteRule, Kick, Mute, Pardon, Unban, Unmute, Warn], [this]);
}