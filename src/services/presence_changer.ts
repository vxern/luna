import { ClientUser } from "discord.js";

import config from '../config.json';

const statuses: Array<string> = [
  `Use '${config.summoner}' to interact with Myna`,
  `Type '${config.summoner} help' for help`,
  `View your achievements using '${config.summoner} achievements'`,
  `Look up a word using '${config.summoner} word <word>'`
];

let currentStatus: number = 0;

export async function cyclePresence(user: ClientUser): Promise<void> {
  user.setStatus('online');
  setInterval(() => setPresence(user), config.presenceCycleIntervalSeconds * 1000);
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