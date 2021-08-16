import { Client } from "../../../client/client";
import { Embed } from "../../../client/embed";

import { Information } from "../information";
import { Command, HandlingData } from "../../command";
import { Module } from "../../module";

import { Utils } from "../../../utils";

import config from '../../../config.json';

export class Help extends Command<Information> {
  readonly identifier = 'help';
  readonly aliases = ['commands'];
  readonly description = 'Displays a menu which explains how to use the bot and lists the available modules.';
  readonly parameters = ['optional: module'];
  readonly handler = this.help;

  async help({message, parameter}: HandlingData) {
    if (parameter === undefined) {
      Client.send(message.channel, new Embed({
        title: 'Help Menu',
        fields: [{
          name: 'How to use the bot',
          value: 'Beside is a list of modules which are available for the user to use. ' + 
                 `To get the full list of commands for a specific module, use: ${Utils.toCode(`${config.alias} help [module]`)}\n` +
                 `To get information on how to use a specific command, use: ${Utils.toCode(`${config.alias} usage [command]`)}`,
          inline: true,
        }, {
          name: 'Available Modules',
          value: Client.modules.map((module) => `${module.name} ~ [${
            module.commandsAll.slice(0, 3).map((command) => command.caller).join(', ')
          }, ...]`).join('\n'),
          inline: true,
        }]
      }));
      return;
    }

    parameter = parameter.toLowerCase();
    const module = Client.modules.find((module) => module.name.toLowerCase() === parameter);

    if (module === undefined) {
      Client.warn(message.channel, 'That module does not exist, ' + 
      `use \`${config.alias} modules\` to get the full list of modules and their commands.`);
      return;
    }

    Module.browse(
      message, 
      module.commandsAll.map((command) => command.fullInformation), 
      (entry) => entry,
      true
    );

    /*
    Client.send(message.channel, new Embed({
      title: `List of commands of the ${module.name.toLowerCase()} module`,
      message: module.commandsAll.map((command) => command.fullInformation).join('\n\n'),
    }));
    */
  }
}