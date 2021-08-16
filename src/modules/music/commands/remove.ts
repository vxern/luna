import { Client } from "../../../client/client";

import { Module } from "../../module";
import { Music } from "../music";
import { Command, HandlingData } from "../../command";

import { Utils } from "../../../utils";

export class Remove extends Command<Music> {
  readonly identifier = 'remove';
  readonly aliases = ['delete'];
  readonly description = 'Removes a song from the list of queued songs.';
  readonly parameters = ['position'];
  readonly handler = this.remove;

  /// Removes a song from queue, taking its index
  async remove({message, parameter}: HandlingData) {
    if (this.module.queue.length === 0) {
      Client.warn(message.channel, 'There are no song listings in the song queue.');
      return;
    }

    let index = Number(parameter);

    if (isNaN(index)) {
      parameter = parameter!.toLowerCase();
      const listings = this.module.queue.filter(
        (song) => song.title.toLowerCase().includes(parameter!)
      );

      if (listings.length === undefined) {
        Client.warn(message.channel, 'There are no song listings that match your query in the song queue.');
        return;
      }

      const songIndex = await Module.browse(
        message, 
        listings.map((_, i) => i + 1), 
        (index) => listings[index - 1].title
      );

      if (songIndex === undefined) {
        return;
      }

      index = songIndex;
    }

    if (!Utils.isIndexInBounds(message.channel, index, this.module.queue.length)) {
      return;
    }

    index -= 1;
    
    if (!this.module.canUserManageListing(
      message.channel, message.author.id, this.module.queue[index]
    )) {
      return;
    }

    const removedSong = this.module.queue.splice(index, 1)[0];

    Client.info(message.channel, `Song listing #${index + 1} ~ '${removedSong.title}' removed from the queue.`);
  }
}