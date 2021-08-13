import { GuildMessage } from "../client/client";
import { Utils } from "../utils";

import { Module } from "./module";

import config from '../config.json';

export interface HandlingData {
  message: GuildMessage;
  dependencies: Map<string, any>;
  parameters: Map<string, string>;
  parameter: string;
}

export abstract class Command<T extends Module> {
  abstract readonly identifier: string;
  /// Aliases which when specified, cause the handler to be called for this command
  abstract readonly aliases: string[];
  /// Description of what this command does
  abstract readonly description: string;
  /// Arguments and parameters this command takes
  abstract readonly parameters: string[];
  /// Which other command's functionality this command requires
  abstract readonly dependencies: any[];
  /// What should happen when a user writes a command's alias
  abstract readonly handler: ({}: HandlingData) => Promise<void>;

  readonly module: T;

  constructor(module: T) {
    this.module = module;
  }

  matchesIdentifierOrAliases(commandName: string): boolean {
    commandName = commandName.toLowerCase();
    return this.identifier === commandName || this.aliases.includes(commandName);
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

  getUsage(): string {
    const parameters = this.parameters.map((parameter) => {
      if (parameter.startsWith('optional: ')) return `[${parameter}]`;

      return `<${parameter}>`;
    }).join(' ');
    return Utils.toCode(`${config.alias} ${this.caller} ${parameters}`);
  }
}