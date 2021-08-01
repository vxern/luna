import { Moderation } from "../moderation";
import { Command } from "../../command";

export class Unban extends Command<Moderation> {
  readonly identifier = 'unban';
  readonly aliases = ['unsuspend'];
  readonly description = 'Unbans a previously indefinitely banned user';
  readonly arguments = ['tag | name | id'];
  readonly dependencies = [];
  readonly handler = this.module.unimplemented;
}