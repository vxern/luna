import { Client } from "../../../client/client";
import { Embed } from "../../../client/embed";

import { Module } from "../../module";
import { Information } from "../information";
import { Command, HandlingData } from "../../command";

import { Utils } from "../../../utils";

export class Usage extends Command<Information> {
  readonly identifier = 'usage';
  readonly aliases = [];
  readonly description = 'Displays useful information about a command such as its aliases and usage.';
  readonly parameters = ['command'];
  readonly dependencies = [];
  readonly handler = this.usage;

  async usage({message, parameter}: HandlingData) {
    const commands = ([] as Command<Module>[]).concat(...Client.modules.map((module) => module.commandsAll));
    const command = commands.find((command) => command.matchesIdentifierOrAliases(parameter!));

    if (command === undefined) {
      Client.warn(message.channel, 'A command with such an identifier or alias does not exist.');
      return;
    }

    Client.send(message.channel, new Embed({
      title: `The '${command.caller}' command`,
      fields: [{
        name: 'Usage',
        value: command.getUsage(),
        inline: true,
      }, {
        name: 'Description',
        value: command.description,
        inline: true,
      }, {
        name: 'Aliases',
        value: command.aliases.length !== 0 ? Utils.toCode(command.aliases.join(', ')) : '-',
        inline: false,
      }]
    }));
  }
}