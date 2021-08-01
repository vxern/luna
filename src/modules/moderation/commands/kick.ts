import { Moderation } from "../moderation";
import { Command } from "../../command";

export class Kick extends Command<Moderation> {
  readonly identifier = 'kick';
  readonly aliases = [];
  readonly description = 'Kicks a user from the server';
  readonly arguments = ['tag | name | id'];
  readonly dependencies = [];
  readonly handler = this.module.unimplemented;
}