import { Module } from "./module";

export abstract class Service<T extends Module> {
  abstract initialise(): Promise<void>;

  readonly module: T;

  constructor(module: T) {
    this.module = module;
  }
}