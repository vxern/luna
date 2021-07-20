import { Client as DiscordClient } from 'discord.js';

import { cyclePresence } from '../services/presence_changer';

export class MynaClient {
  modules!: Array<any>;
  client: DiscordClient;

  constructor() {
    this.client = new DiscordClient();
    
    this.client.on('ready', () => this.initialize());
  }

  async initialize(): Promise<void> {
    cyclePresence(this.client.user!);

    this.modules = [];

    console.info(`Myna is ready to serve with ${this.modules.length} modules.`);
  }

  async login(): Promise<void> {
    await this.client.login(process.env.DISCORD_SECRET);
  }
}