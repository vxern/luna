import { LunaClient } from "../client/client";
import { Embed } from "../client/embed";

export abstract class LunaModule {
  [functionName: string]: Function | Object;
  readonly requirement: Function | boolean = true;
  readonly beforeExecutingCommand: Function = () => {};
  abstract readonly commandTree: Object;
  args: any;

  async unimplemented(): Promise<boolean> {
    LunaClient.error(this.args['textChannel'], new Embed({
      message: 'This function is not yet implemented',
    }));
    return true;
  }
}