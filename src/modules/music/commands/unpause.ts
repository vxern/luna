import { Client } from "../../../client/client";

import { Music } from "../music";
import { Command, HandlingData } from "../../command";

export class Unpause extends Command<Music> {
  readonly identifier = 'unpause';
  readonly aliases = ['resume', 'start'];
  readonly description = 'Unpause the song';
  readonly parameters = [];
  readonly dependencies = [];
  readonly handler = this.unpause;

  /// Resumes the song playing
  async unpause({message}: HandlingData) {
    if (!this.module.isPlaying) {
      Client.warn(message.channel, 'There is no song to resume.');
      return;
    }

    if (!this.module.canUserManageListing(
      message.channel, message.author.id, this.module.currentListing!
    )) {
      return;
    }
    
    if (!this.module.voiceConnection!.dispatcher.paused) {
      Client.warn(message.channel, 'The song is not paused.');
      return; 
    }

    // TODO: Fix this disgusting hack
    // https://github.com/discordjs/discord.js/issues/5300
    this.module.voiceConnection.dispatcher.resume();
    this.module.voiceConnection.dispatcher.pause();
    this.module.voiceConnection.dispatcher.resume();

    Client.info(message.channel, `Resumed '${this.module.currentSong!.title}'.`);
  }

}