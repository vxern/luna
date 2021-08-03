import { Message, TextChannel } from "discord.js";

import { Client } from "../../../client/client";
import { Embed } from "../../../client/embed";

import { Information } from "../information";
import { Command } from "../../command";

import config from '../../../config.json';

export class Help extends Command<Information> {
  readonly identifier = 'help';
  readonly aliases = ['commands'];
  readonly description = 'Displays a menu explaining how to use the bot and a list of available modules';
  readonly arguments = ['optional: module'];
  readonly dependencies = [];
  readonly handler = this.help;

  async help(message: Message) {
    if (message.content.length === 0) {
      Client.send(message.channel as TextChannel, new Embed({
        title: 'Help Menu',
        fields: [{
          name: 'How to use the bot',
          value: 'Beside is a list of modules which are available for the user to use. ' + 
                 `To get the full list of commands for a specific module, use ${'```'}${config.alias} help [module]${'```'}`,
          inline: true,
        }, {
          name: 'Available Modules',
          value: Client.modules.map((module) => `${module.name} ~ [${
            module.commands.slice(0, 3).map((command) => command.caller).join(', ')
          }, ...]`).join('\n'),
          inline: true,
        }]
      }));
      return;
    }

    const messageLowercase = message.content.toLowerCase();
    const module = Client.modules.find((module) => module.name.toLowerCase() === messageLowercase);

    if (module === undefined) {
      Client.warn(message.channel as TextChannel, 'That module does not exist, ' + 
      `use \`${config.alias} modules\` to get the full list of modules and their commands.`);
      return;
    }

    Client.send(message.channel as TextChannel, new Embed({
      title: `List of commands of the ${module.name.toLowerCase()} module`,
      message: module.commands.map((command) => command.fullInformation).join('\n\n'),
    }));
  }
}