import { Message, TextChannel } from "discord.js";

import { Client } from "../../../client/client";

import { Music } from "../music";
import { Command } from "../../command";
import { Replay } from "./replay";
import { Play } from "./play";

import { Utils } from "../../../utils";

export class Rewind extends Command<Music> {
  readonly identifier = 'rewind';
  readonly aliases = [];
  readonly description = 'Rewind the song by the given amount of time';
  readonly arguments = ['time'];
  readonly dependencies = [Replay, Play];
  readonly handler = this.rewind;
  
  /// Rewinds the song by a given number of seconds
  async rewind(message: Message, dependencies: Map<string, any>) {
    const seconds = this.module.resolveTimeQuery(message, message.content.toLowerCase());

    if (seconds === undefined) return;

    if (!this.module.isPlaying()) {
      Client.warn(message.channel as TextChannel, 'There is no song to rewind.');
      return;
    }

    if (!this.module.canUserManageListing(
      message.channel as TextChannel, message.author.id, this.module.currentListing!
    )) {
      return;
    }

    // How long the song has been running for since the last time it has been played
    const currentOffset = this.module.currentSong!.offset;
    const streamTime = this.module.streamTimeInSeconds();
    const totalOffset = currentOffset + streamTime - seconds;

    let rewindMessage;

    if (totalOffset <= 5) {
      this.module.currentSong!.offset = 0;
      rewindMessage = 'to start';
    } else {
      this.module.currentSong!.offset = totalOffset;
      rewindMessage = `by ${Utils.convertSecondsToExtendedFormat(seconds)}`;
    }

    Client.info(message.channel as TextChannel, 
      `Rewound the song ${rewindMessage}. ~ ` + 
      `${this.module.runningTimeAsString()}`,
    );

    dependencies.get('Replay').replay(message, dependencies);
  }
}