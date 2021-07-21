type Handler = (args: Array<any>) => Promise<boolean>

export class MynaModule {
  [functionName: string]: Handler;
}