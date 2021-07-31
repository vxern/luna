import { Message, TextChannel } from "discord.js";

import { Client } from "../../../client/client";

import { Music } from "../music";
import { Command } from "../../command";
import { Unpause } from "./unpause";

export class Pause extends Command<Music> {
  readonly identifier = 'pause';
  readonly aliases = ['stop', 'halt'];
  readonly description = 'Pause the song';
  readonly arguments = [];
  readonly dependencies = [Unpause];
  readonly handler = this.pause;

  /// Pauses or unpauses the song playing
  async pause(message: Message, dependencies: Map<string, any>) {
    if (!this.module.isPlaying()) {
      Client.warn(message.channel as TextChannel, 'There is no song to pause');
      return;
    }

    if (!this.module.userCanManageListing(message.channel as TextChannel, message.author.id, this.module.currentListing!)) {
      return;
    }

    if (this.module.voiceConnection!.dispatcher.paused) {
      dependencies.get('Unpause').unpause(message);
      return;
    }

    this.module.voiceConnection!.dispatcher.pause();
    
    Client.info(message.channel as TextChannel, `Paused '${this.module.currentSong!.title}'`);
  }
}