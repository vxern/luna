import { Message } from "discord.js";
import { Utils } from "../utils";

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

  matchesIdentifierOrAliases(argument: string): boolean {
    argument = argument.toLowerCase();
    return this.identifier === argument || this.aliases.includes(argument);
  }

  get caller(): string {
    let caller = this.identifier;

    if (this.identifier.startsWith('$')) {
      caller = `[${this.identifier.replace('$', '')}]`;
    }

    return caller;
  }
  
  get fullInformation(): string {
    return `${this.caller} ~ ${this.description}`;
  }

  get getUsage(): string {
    const requiredArguments = this.arguments.map((argument) => ` [${argument}]`).join(' ');
    return `\`${this.caller + requiredArguments}\``;
  }
}