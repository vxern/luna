import { GuildMessage } from '../../client/client';

import { Module } from '../module';

import { Utils } from '../../utils';

export class Social extends Module {
  readonly requirement = (message: GuildMessage) => Utils.isModerator(message);
  readonly commandsRestricted = Utils.instantiate([], [this]);
  readonly commandUnrestricted = Utils.instantiate([], [this]);
}