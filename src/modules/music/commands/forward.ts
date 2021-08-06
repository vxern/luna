import { Client } from "../../../client/client";

import { Music } from "../music";
import { Command, HandlingData } from "../../command";
import { Replay } from "./replay";
import { Play } from "./play";

import { Utils } from "../../../utils";

export class Forward extends Command<Music> {
  readonly identifier = 'forward';
  readonly aliases = [];
  readonly description = 'Fast-forward the song by the given amount of time';
  readonly parameters = ['time'];
  readonly dependencies = [Replay, Play];
  readonly handler = this.forward;

  /// Fast-forwards the song by a given number of seconds
  async forward({message, dependencies, parameter}: HandlingData) {
    const seconds = this.module.resolveTimeQuery(
      message.channel, 
      parameter!,
      ['second', 'minute', 'hour'],
      'second',
    );

    if (seconds === -1) return;

    if (!this.module.isPlaying) {
      Client.warn(message.channel, 'There is no song to fast-forward.');
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
    const totalOffset = currentOffset + streamTime + seconds;

    if (totalOffset >= this.module.currentSong!.duration - 5) {
      Client.warn(message.channel, 'Cannot fast-forward beyond the song duration.');
      return;
    }

    this.module.currentSong!.offset = totalOffset;

    Client.info(message.channel,
      `Fast-forwarded the song by ${Utils.convertSecondsToExtendedFormat(seconds)} ~ ` + 
      `${this.module.runningTimeAsString()}.`
    );

    dependencies.get('Replay').replay(message, dependencies);
  }
}