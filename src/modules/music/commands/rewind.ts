import { Client } from "../../../client/client";

import { Music } from "../music";
import { Command, HandlingData } from "../../command";
import { Replay } from "./replay";
import { Play } from "./play";

import { Utils } from "../../../utils";

export class Rewind extends Command<Music> {
  readonly identifier = 'rewind';
  readonly aliases = [];
  readonly description = 'Rewind the song by the given amount of time';
  readonly parameters = ['time'];
  readonly dependencies = [Replay, Play];
  readonly handler = this.rewind;
  
  /// Rewinds the song by a given number of seconds
  async rewind({message, dependencies, parameter}: HandlingData) {
    const seconds = this.module.resolveTimeQuery(
      message.channel, 
      parameter!,
      ['second', 'minute', 'hour'],
      'second',
    );
    
    if (seconds === -1) return;

    if (!this.module.isPlaying) {
      Client.warn(message.channel, 'There is no song to rewind.');
      return;
    }

    if (!this.module.canUserManageListing(
      message.channel, message.author.id, this.module.currentListing!
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

    Client.info(message.channel, 
      `Rewound the song ${rewindMessage}. ~ ` + 
      `${this.module.runningTimeAsString()}`,
    );

    dependencies.get('Replay').replay(message, dependencies);
  }
}