import { Client } from "../../../client/client";

import { Command, HandlingData } from "../../command";
import { Music } from "../music";

import { Utils } from "../../../utils";

import config from '../../../config.json';

export class Volume extends Command<Music> {
  readonly identifier = 'volume';
  readonly aliases = ['vol'];
  readonly description = 'Changes the volume of playback';
  readonly parameters = ['volume'];
  readonly dependencies = [];
  readonly handler = this.volume;

  /// Changes the song's volume
  async volume({message, parameter}: HandlingData) {
    if (!Utils.isNumber(parameter)) {
      Client.warn(message.channel, 'The specified volume is not a number.');
      return;
    }

    const volume = Number(parameter);

    if (volume < 0) {
      Client.warn(message.channel, 'It is not recommended to set the volume to a negative value.');
      return;
    }

    if (volume > config.maximumVolume) {
      Client.warn(message.channel, `The maximum volume is ${config.maximumVolume}%.`);
      return;
    }

    this.module.volume = volume / 100;
    this.module.voiceConnection?.dispatcher.setVolume(this.module.volume);

    if (volume !== 0) {
      Client.info(message.channel, `Volume set to ${volume}%.`);
      return;
    }

    Client.info(message.channel, `Muted playback.`);
  }
}