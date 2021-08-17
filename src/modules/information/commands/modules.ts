import { Client } from "../../../client/client";
import { Embed } from "../../../client/embed";

import { Information } from "../information";
import { Command, HandlingData } from "../../command";
import { Module } from "../../module";

import { Service } from "../../service";

import { Utils } from "../../../utils";

export class Modules extends Command<Information> {
  readonly identifier = 'modules';
  readonly aliases = ['commands'];
  readonly description = 'Displays a menu listing installed modules, commands and services.';
  readonly parameters = [];
  readonly handler = this.modules;

  async modules({message}: HandlingData) {
    Client.send(message.channel, new Embed({
      title: 'Available Modules',
      thumbnail: Client.bot.displayAvatarURL(),
      fields: Client.modules.map((module) => {return {
        name: module.name,
        value: this.displayLists(module),
        inline: true,
      }})
    }));
  }

  displayLists(module: Module): string {
    const displayCommandNames = 
      (commands: Command<Module>[]) => commands.length !== 0 ? 
        '`' + commands.map((command) => command.identifier).sort().join('` `') + '`' :
        '-';

    const displayServiceNames = 
      (services: Service<Module>[]) => services.length !== 0 ? 
        '`' + services.map((service) => Utils.getNameOfClass(service)).sort().join('` `') + '`' :
        '-';

    return '📋⠀' + displayCommandNames(module.commandsUnrestricted) +
      '\n\n🚸⠀' + displayCommandNames(module.commandsRestricted) + 
      '\n\n🔧⠀' + displayServiceNames(module.services);
  }
}