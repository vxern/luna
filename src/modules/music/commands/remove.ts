import { Message, TextChannel } from "discord.js";

import { Client } from "../../../client/client";

import { Music } from "../music";
import { Command } from "../../command";

import { Utils } from "../../../utils";

export class Remove extends Command<Music> {
  readonly identifier = 'remove';
  readonly aliases = ['delete'];
  readonly description = 'Removes a song in queue';
  readonly arguments = [];
  readonly dependencies = [];
  readonly handler = this.remove;

  /// Removes a song from queue, taking its index
  async remove(message: Message) {
    if (this.module.queue.length === 0) {
      Client.warn(message.channel as TextChannel, 'There are no song listings in the song queue.');
      return;
    }

    let index = Number(message.content);

    if (isNaN(index)) {
      message.content = message.content.toLowerCase();
      const songIndex = this.module.queue.findIndex(
        (song) => song.title.toLowerCase().includes(message.content)
      );

      if (songIndex === undefined) {
        Client.warn(message.channel as TextChannel, 'There are no song listings that match your query in the song queue.');
        return;
      }

      index = songIndex;
    }

    if (!Utils.isIndexInBounds(message.channel as TextChannel, index, this.module.queue.length)) {
      return;
    }

    index -= 1;
    
    if (!this.module.canUserManageListing(
      message.channel as TextChannel, message.author.id, this.module.queue[index]
    )) {
      return;
    }

    const removedSong = this.module.queue.splice(index, 1)[0];

    Client.info(message.channel as TextChannel, `Song listing #${index} ~ '${removedSong.title}' removed from the queue.`);
  }
}