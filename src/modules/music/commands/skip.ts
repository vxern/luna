import { Message, TextChannel } from "discord.js";

import { Client } from "../../../client/client";

import { Music } from "../music";
import { Command } from "../../command";
import { Play } from "./play";

export class Skip extends Command<Music> {
  readonly identifier = 'skip';
  readonly aliases = ['next'];
  readonly description = 'Plays the next song in queue';
  readonly arguments = [];
  readonly dependencies = [Play];
  readonly handler = this.skip;

  /// Plays the next song
  async skip(message: Message, dependencies: Map<string, any>) {
    if (!this.module.isPlaying()) {
      Client.warn(this.module.textChannel!, 'There is no song to skip.');
      return;
    }

    // TODO: This song is repeated in multiple commands
    if (!this.module.canUserManageListing(message.channel as TextChannel, message.author.id, this.module.currentListing!)) {
      return;
    }

    Client.info(this.module.textChannel!, `Skipped '${this.module.currentSong!.title}'.`);

    dependencies.get('Play').play();
  }
}