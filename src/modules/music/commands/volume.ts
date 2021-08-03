import { Message, TextChannel } from "discord.js";

import { Client } from "../../../client/client";

import { Command } from "../../command";
import { Music } from "../music";

import { Utils } from "../../../utils";

import config from '../../../config.json';

export class Volume extends Command<Music> {
  readonly identifier = 'volume';
  readonly aliases = ['vol'];
  readonly description = 'Changes the volume of playback';
  readonly arguments = ['volume'];
  readonly dependencies = [];
  readonly handler = this.volume;

  /// Changes the song's volume
  async volume(message: Message) {
    if (!Utils.isNumber(message.content)) {
      Client.warn(message.channel as TextChannel, 'The specified volume is not a number.');
      return;
    }

    const volume = Number(message.content);

    if (volume <= 0) {
      Client.warn(message.channel as TextChannel, 'It is not recommended to set the volume to a negative value.');
      return;
    }

    if (volume > config.maximumVolume) {
      Client.warn(message.channel as TextChannel, `The maximum volume is ${config.maximumVolume}%.`);
      return;
    }

    this.module.volume = volume / 100;
    this.module.voiceConnection?.dispatcher?.setVolume(this.module.volume);

    Client.info(message.channel as TextChannel, `Volume set to ${volume}%.`);
  }
}