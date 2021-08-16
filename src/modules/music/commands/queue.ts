import { Client } from "../../../client/client";
import { Embed } from "../../../client/embed";

import { Music } from "../music";
import { Command, HandlingData } from "../../command";

export class Queue extends Command<Music> {
  readonly identifier = 'queue';
  readonly aliases = ['songs', 'songqueue', 'upcoming'];
  readonly description = 'Displays a list of queued songs.';
  readonly parameters = [];
  readonly handler = this.displayQueue;

  /// Displays the current song queue
  async displayQueue({message}: HandlingData) {
    Client.send(message.channel, Embed.singleField({
      name: 'Upcoming Songs',
      value: this.module.queue.length === 0 ? 
        'No songs in queue.' :
        this.module.queue.map((listing, index) => `${index + 1} ~ ${listing.info}`).join('\n\n'),
      inline: false,
    }));
  }
}