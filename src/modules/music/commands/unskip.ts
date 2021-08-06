import { Client } from "../../../client/client";

import { Music } from "../music";
import { Command, HandlingData } from "../../command";
import { Play } from "./play";

export class Unskip extends Command<Music> {
  readonly identifier = 'unskip';
  readonly aliases = ['previous'];
  readonly description = 'Plays the last played song';
  readonly parameters = [];
  readonly dependencies = [Play];
  readonly handler = this.unskip;
  
  /// Plays the last song
  async unskip({message, dependencies}: HandlingData) {
    if (this.module.history.length === 0) {
      Client.warn(message.channel, 'There are no song listings in the history.');
      return;
    }

    if (this.module.isPlaying) {
      if (!this.module.canUserManageListing(
        message.channel, 
        message.author.id, 
        this.module.currentListing!)
      ) {
        return;
      }

      this.module.queue.unshift(this.module.currentListing!);
    }

    const listingToUnskip = this.module.history.pop()!;
    // Update the song managers of the unskipped listing to the users currently present
    listingToUnskip.songManagers = this.module.usersPresent();
    this.module.queue.unshift(listingToUnskip);

    dependencies.get('Play').play();
  }
}