import { LunaClient } from "../client/client";
import { Embed } from "../structs/embed";

export type Handler = (args?: any[]) => Promise<boolean>

export abstract class LunaModule {
  [functionName: string]: Handler | Object;
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