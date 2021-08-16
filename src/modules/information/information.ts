import { Module } from '../module';

import { Help } from './commands/help';
import { Info } from './commands/info';
import { Usage } from './commands/usage';

import { Presence } from './services/presence';

import { Utils } from '../../utils';

export class Information extends Module {
  readonly commandUnrestricted = Utils.instantiate([Help, Info, Usage], [this]);
  readonly services = Utils.instantiate([Presence], [this]);
}