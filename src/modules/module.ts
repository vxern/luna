export type Handler = (args?: any[]) => Promise<boolean>

export abstract class LunaModule {
  [functionName: string]: Handler | Object;
  requirement: Handler | boolean = true;
  abstract commandTree: Object;
  args: any;
}