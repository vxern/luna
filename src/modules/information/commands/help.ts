import { Message, TextChannel } from "discord.js";
import { Client } from "../../../client/client";
import { Embed } from "../../../client/embed";
import { Utils } from "../../../utils";

import { Command } from "../../command";
import { Information } from "../information";

export class Help extends Command<Information> {
  readonly identifier = 'help';
  readonly aliases = ['commands'];
  readonly description = 'Displays a list of commands and their usages from every module';
  readonly arguments = [];
  readonly dependencies = [];
  readonly handler = this.help;

  async help(message: Message) {
    Client.send(message.channel as TextChannel, new Embed({
      title: 'Commands',
      fields: Utils.getNamesOfClasses(Client.modules).map((name, index) => {return {
        name: name,
        value: Client.modules[index].commands.map((command) => command.toString()).join('\n'),
        inline: false,
      }})
    }));
  }
}