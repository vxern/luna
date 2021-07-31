import { Client } from "../../../client/client";
import { Embed } from "../../../client/embed";

import { Music } from "../music";
import { Command } from "../../command";
import { SongCollection } from "../songs";

export class Queue extends Command<Music> {
  readonly identifier = 'queue';
  readonly aliases = ['songs', 'songqueue', 'upcoming'];
  readonly description = 'Display a list of upcoming songs';
  readonly arguments = [];
  readonly dependencies = [];
  readonly handler = this.displayQueue;

  /// Displays the current song queue
  async displayQueue() {
    Client.send(this.module.textChannel!, Embed.singleField({
      name: 'Up Next',
      value: this.module.queue.length === 0 ? 
        'No songs in queue' :
        this.module.queue.map((listing, index) => `${index + 1} ~ ${listing.info}`).join('\n\n'),
      inline: false,
    }));
  }
}