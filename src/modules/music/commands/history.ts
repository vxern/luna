import { Client } from "../../../client/client";
import { Embed } from "../../../client/embed";

import { Music } from "../music";
import { Command } from "../../command";

import { Listing } from "../songs";

export class History extends Command<Music> {
  readonly identifier = 'history';
  readonly aliases = ['past', 'played'];
  readonly description = 'Display a list of songs played previously';
  readonly arguments = [];
  readonly dependencies = [];
  readonly handler = this.displayHistory;

  /// Displays the history of songs played
  async displayHistory() {
    Client.send(this.module.textChannel!, Embed.singleField({
      name: 'History',
      value: this.module.history.length === 0 ? 
        'No songs have been played before' :
        this.module.history.reverse().map((listing, index) => `${index + 1} ~ ${listing.info}`).join('\n\n'),
      inline: false,
    }));
  }
}