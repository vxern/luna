import { ClientUser } from "discord.js";

import { Service } from "./service";

import config from '../config.json';
import { Client } from "../client/client";

const repositoryLink = `https://github.com/vxern/${config.alias}`;
const statuses: Array<string> = [
  `Use '${config.alias}' to interact with me`,
  `Type '${config.alias} help' for help`,
  `View your achievements using '${config.alias} achievements'`,
  `Look up a word using '${config.alias} word <word>'`,
];

export class Presence extends Service {
  private currentStatus: number = 0;

  async initialise() {
    Client.bot.setStatus('online');
    this.cyclePresence();
  }

  /// Periodically update the bot's presence
  private async cyclePresence() {
    setInterval(() => {
      Client.bot.setPresence({activity: {
        name: this.cycleStatus(),
        type: 'PLAYING',
        url: repositoryLink,
      }});
    }, config.presenceCycleIntervalInSeconds * 1000);
  }

  /// Cycles through [statuses] and returns the current status
  private cycleStatus(): string {
    const current = statuses[this.currentStatus];

    if (this.currentStatus !== statuses.length - 1) {
      this.currentStatus += 1;
    } else {
      this.currentStatus = 0;
    }

    return current;
  }
}