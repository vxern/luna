import { exec } from "child_process";

import { Client } from "../../../client/client";
import { Embed } from "../../../client/embed";

import { Information } from "../information";
import { Command, HandlingData } from "../../command";
import { Module } from "../../module";

import { Utils } from "../../../utils";

import config from '../../../config.json';

export class Help extends Command<Information> {
  readonly identifier = 'help';
  readonly aliases = [];
  readonly description = 'Displays a menu which explains how to use the bot and lists the available modules.';
  readonly parameters = ['optional: module'];
  readonly handler = this.help;

  async help({message, parameter}: HandlingData) {
    const [numberOfFiles, linesOfCode] = await new Promise((resolve) => {
      exec('yarn cloc src --include-lang=TypeScript --json', (_, stdout) => {
        const json = JSON.parse(stdout.split('\n').slice(2).join('\n'));
        resolve([json.SUM.nFiles, json.SUM.code]);
      });
    });

    if (parameter === undefined) {
      Client.send(message.channel, new Embed({
        title: 'Help Menu',
        thumbnail: Client.bot.displayAvatarURL(),
        fields: [{
          name: 'Information',
          value: 
            `I am **${Utils.capitaliseWords(config.alias)}** - a custom bot written in **TypeScript** ` + 
            `by ${Utils.toUserTag('217319536485990400')}. I span **${numberOfFiles}** files and **${linesOfCode}** lines of code.`,
          inline: false,
        }, {
          name: 'How to use the bot',
          value: `To get a list of commands, use: ${Utils.toCode(`${config.alias} modules`)}\n` +
                 `To get information on how to use a specific command, use: ${Utils.toCode(`${config.alias} usage [command]`)}`,
          inline: false,
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
  }
}