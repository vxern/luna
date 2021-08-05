import { Client } from "../../../client/client";

import { Music } from "../music";
import { Command, HandlingData } from "../../command";
import { Play } from "./play";

export class Replay extends Command<Music> {
  readonly identifier = 'replay';
  readonly aliases = ['restart'];
  readonly description = 'Begin playing the song from the start';
  readonly parameters = [];
  readonly dependencies = [Play];
  readonly handler = this.replay;

  /// Restarts the current running song
  async replay({message, dependencies}: HandlingData) {
    if (this.module.currentSong === undefined) {
      Client.warn(message.channel, 'There is no song to replay.');
      return;
    }

    if (!this.module.canUserManageListing(
      message.channel, message.author.id, this.module.currentListing!
    )) {
      return;
    }

    // Add the current song to the beginning of the song queue and start playing
    this.module.queue.unshift(this.module.currentListing!);

    if (message) {
      Client.info(this.module.textChannel!, `Replaying '${this.module.currentSong!.title}'...`);
    }

    this.module.currentSong = undefined;
    dependencies.get('Play').play(undefined, false);
  }
}