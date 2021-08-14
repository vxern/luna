import { Client } from "../../../client/client";

import { Music } from "../music";
import { Command, HandlingData } from "../../command";
import { Unpause } from "./unpause";

export class Pause extends Command<Music> {
  readonly identifier = 'pause';
  readonly aliases = ['stop', 'halt'];
  readonly description = 'Pauses the song indefinitely.';
  readonly parameters = [];
  readonly dependencies = [Unpause];
  readonly handler = this.pause;

  /// Pauses or unpauses the song playing
  async pause({message, dependencies}: HandlingData) {
    if (!this.module.isPlaying) {
      Client.warn(message.channel, 'There is no song to pause.');
      return;
    }

    if (!this.module.canUserManageListing(
      message.channel, message.author.id, this.module.currentListing!
    )) {
      return;
    }

    if (this.module.voiceConnection?.dispatcher.paused) {
      dependencies.get('Unpause').unpause({message: message});
      return;
    }

    this.module.voiceConnection?.dispatcher.pause();
    
    Client.info(message.channel, `Paused '${this.module.currentSong!.title}'.`);
  }
}