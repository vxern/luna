import { Client } from "../../../client/client";

import { Music } from "../music";
import { Command, HandlingData } from "../../command";
import { Play } from "./play";

export class Skip extends Command<Music> {
  readonly identifier = 'skip';
  readonly aliases = ['next'];
  readonly description = 'Plays the next song in queue';
  readonly parameters = [];
  readonly dependencies = [Play];
  readonly handler = this.skip;

  /// Plays the next song
  async skip({message, dependencies}: HandlingData) {
    if (!this.module.isPlaying) {
      Client.warn(message.channel, 'There is no song to skip.');
      return;
    }

    // TODO: This song is repeated in multiple commands
    if (!this.module.canUserManageListing(
      message.channel, message.author.id, this.module.currentListing!
    )) {
      return;
    }

    Client.info(message.channel, `Skipped '${this.module.currentSong!.title}'.`);

    dependencies.get('Play').play(message.channel);
  }
}