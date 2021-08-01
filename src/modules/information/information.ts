import { Module } from '../module';

import { Help } from './commands/help';
import { Info } from './commands/info';

import { Utils } from '../../utils';

export class Information extends Module {
  readonly commands = Utils.instantiated([Help, Info], [this]);
}