export type Handler = (args: Array<any>) => Promise<boolean>

export abstract class MynaModule {
  [functionName: string]: Handler | Object;
  abstract commandTree: Object;
  args: any;

  constructor(args: Object) {
    this.args = args;
  }
}