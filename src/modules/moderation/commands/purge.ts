import { Moderation } from "../moderation";
import { Command, HandlingData } from "../../command";

import { Utils } from "../../../utils";
import { GuildMessage } from "../../../client/client";

export class Purge extends Command<Moderation> {
  readonly identifier = 'purge';
  readonly aliases = ['delete'];
  readonly description = 'Deletes a specified number of messages from a channel';
  readonly parameters = ['number'];
  readonly dependencies = [];
  readonly handler = this.purge;

  async purge({message, parameter}: HandlingData) {
    const numberToDelete = Utils.resolveNumber(message.channel, parameter!);

    if (numberToDelete === -1) {
      return;
    }
    
    const iterations = Math.floor(numberToDelete / 100);

    for (let iteration = 0; iteration < iterations; iteration++) {
      message.channel.bulkDelete(100);
    }

    message.channel.bulkDelete(numberToDelete - 100 * iterations + 1);
  }
}