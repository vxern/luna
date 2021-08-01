import { Moderation } from "../moderation";
import { Command } from "../../command";

export class Ban extends Command<Moderation> {
  readonly identifier = 'ban';
  readonly aliases = ['suspend'];
  readonly description = 'Bans a user indefinitely';
  readonly arguments = ['tag | name | id'];
  readonly dependencies = [];
  readonly handler = this.module.unimplemented;
}