import { Message, TextChannel } from "discord.js";

import { Client } from "../../../client/client";

import { Music } from "../music";
import { Command } from "../../command";

export class Unpause extends Command<Music> {
  readonly identifier = 'unpause';
  readonly aliases = ['resume', 'start'];
  readonly description = 'Unpause the song';
  readonly arguments = [];
  readonly dependencies = [];
  readonly handler = this.unpause;

  /// Resumes the song playing
  async unpause(message: Message) {
    if (!this.module.isPlaying()) {
      Client.warn(message.channel as TextChannel, 'There is no song to resume');
      return;
    }

    if (!this.module.userCanManageListing(message.channel as TextChannel, message.author.id, this.module.currentListing!)) {
      return;
    }
    
    if (!this.module.voiceConnection!.dispatcher.paused) {
      Client.warn(message.channel as TextChannel, 'The song is not paused');
      return; 
    }

    // TODO: Fix this disgusting hack
    // https://github.com/discordjs/discord.js/issues/5300
    this.module.voiceConnection!.dispatcher.resume();
    this.module.voiceConnection!.dispatcher.pause();
    this.module.voiceConnection!.dispatcher.resume();

    Client.info(message.channel as TextChannel, `Resumed '${this.module.currentSong!.title}'`);
  }

}