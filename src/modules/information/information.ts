import { Module } from '../module';

import { Help } from './commands/help';
import { Info } from './commands/info';
import { Usage } from './commands/usage';

import { Utils } from '../../utils';

export class Information extends Module {
  readonly commands = Utils.instantiated([Help, Info, Usage], [this]);
}