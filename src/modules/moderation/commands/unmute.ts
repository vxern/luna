import { Moderation } from "../moderation";
import { Command } from "../../command";

export class Unmute extends Command<Moderation> {
  readonly identifier = 'unmute';
  readonly aliases = ['unsilence'];
  readonly description = 'Unmutes a user, allowing them access to the server again';
  readonly parameters = ['identifier'];
  readonly dependencies = [];
  readonly handler = this.module.displayUnimplemented;
}