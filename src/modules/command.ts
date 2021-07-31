import { Message } from "discord.js";

import { Module } from "./module";

export abstract class Command<T extends Module> {
  abstract readonly identifier: string;
  /// Aliases which when specified, cause the handler to be called for this command
  abstract readonly aliases: string[];
  /// Description of what this command does
  abstract readonly description: string;
  /// Arguments and parameters this command takes
  abstract readonly arguments: string[];
  /// Which other command's functionality this command requires
  abstract readonly dependencies: any[];
  /// What should happen when a user writes a command's alias
  abstract readonly handler: (message: Message, dependencies: Map<string, any>) => Promise<void>;

  readonly module: T;

  constructor(module: T) {
    this.module = module;
  }
}