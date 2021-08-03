import { Moderation } from "../moderation";
import { Command } from "../../command";

export class Warn extends Command<Moderation> {
  readonly identifier = 'warn';
  readonly aliases = [];
  readonly description = 'Warns a user';
  readonly arguments = ['tag | name | id'];
  readonly dependencies = [];
  readonly handler = this.module.displayUnimplemented;
}