import { Message, TextChannel } from "discord.js";

import { Client } from "../../../client/client";
import { Embed } from "../../../client/embed";

import { Module } from "../../module";
import { Information } from "../information";
import { Command } from "../../command";

export class Usage extends Command<Information> {
  readonly identifier = 'usage';
  readonly aliases = [];
  readonly description = 'Displays info about a command and its usage';
  readonly arguments = ['name of command'];
  readonly dependencies = [];
  readonly handler = this.usage;

  async usage(message: Message) {
    const commands = ([] as Command<Module>[]).concat(...Client.modules.map((module) => module.commands));
    const command = commands.find((command) => command.matchesIdentifierOrAliases(message.content));

    if (command === undefined) {
      Client.warn(message.channel as TextChannel, 'A command with such an identifier or alias does not exist.');
      return;
    }

    Client.send(message.channel as TextChannel, new Embed({
      title: `The '${command.caller}' command`,
      fields: [{
        name: 'Aliases',
        value: command.aliases.length !== 0 ? command.aliases.join(', ') : '',
        inline: true,
      }, {
        name: 'Description',
        value: command.description,
        inline: true,
      }, {
        name: 'Usage',
        value: command.getUsage,
        inline: false,
      }]
    }));
  }
}