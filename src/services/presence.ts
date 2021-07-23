import { ClientUser } from "discord.js";

import config from '../config.json';

const statuses: Array<string> = [
  `Use '${config.alias}' to interact with me`,
  `Type '${config.alias} help' for help`,
  `View your achievements using '${config.alias} achievements'`,
  `Look up a word using '${config.alias} word <word>'`
];

let currentStatus: number = 0;

export async function cyclePresence(user: ClientUser): Promise<void> {
  user.setStatus('online');
  setInterval(() => setPresence(user), config.presenceCycleIntervalInSeconds * 1000);
}

async function setPresence(user: ClientUser): Promise<void> {
  user.setPresence({
    activity: {
      name: statuses[currentStatus],
      type: 'PLAYING',
    },
  });

  if (currentStatus === statuses.length - 1) {
    currentStatus = 0;
    return;
  }

  currentStatus += 1;
}