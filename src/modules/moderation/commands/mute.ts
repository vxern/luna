import { Moderation } from "../moderation";
import { Command } from "../../command";

export class Mute extends Command<Moderation> {
  readonly identifier = 'mute';
  readonly aliases = ['silence'];
  readonly description = 'Mutes a user, effectively excluding them from the server';
  readonly arguments = ['tag | name | id'];
  readonly dependencies = [];
  readonly handler = this.module.unimplemented;
}