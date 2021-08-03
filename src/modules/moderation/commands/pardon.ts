import { Moderation } from "../moderation";
import { Command } from "../../command";

export class Pardon extends Command<Moderation> {
  readonly identifier = 'pardon';
  readonly aliases = [];
  readonly description = `Pardons a user by removing a warning they've received`;
  readonly arguments = ['tag | name | id', 'warning id'];
  readonly dependencies = [];
  readonly handler = this.module.displayUnimplemented;
}