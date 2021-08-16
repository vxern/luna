import { Client } from "../../../client/client";
import { Embed } from "../../../client/embed";

import { Music } from "../music";
import { Command, HandlingData } from "../../command";

export class History extends Command<Music> {
  readonly identifier = 'history';
  readonly aliases = ['past', 'played'];
  readonly description = 'Displays a list of previously played songs.';
  readonly parameters = [];
  readonly handler = this.displayHistory;

  /// Displays the history of songs played
  async displayHistory({message}: HandlingData) {
    Client.send(message.channel, Embed.singleField({
      name: 'History',
      value: this.module.history.length === 0 ? 
        'No songs have been played before.' :
        this.module.history.reverse().map((listing, index) => `${index + 1} ~ ${listing.info}`).join('\n\n'),
      inline: false,
    }));
  }
}