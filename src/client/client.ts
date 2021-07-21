import { Client as DiscordClient, TextChannel, EmbedField } from 'discord.js';

import { cyclePresence } from '../services/presence';
import { Embed } from '../structs/embed';

import config from '../config.json';

export class MynaClient {
  private modules!: Array<any>;
  private client: DiscordClient;

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

  static async sendEmbed(textChannel: TextChannel, embed: Embed) {
    textChannel.send({embed: {
      title: embed.title,
      thumbnail: {url: embed.thumbnail},
      description: embed.message,
      color: embed.color,
      fields: embed.fields,
    }})
  }

  static async tip(textChannel: TextChannel, embed: Embed) {
    if (embed.message !== undefined) {
      embed.message = `:bulb: ` + embed.message;
    }
    embed.color = config.accentColorTip;
    this.sendEmbed(textChannel, embed);
  }

  static async warn(textChannel: TextChannel, embed: Embed) {
    if (embed.message !== undefined) {
      embed.message = `:warning: ` + embed.message;
    }
    embed.color = config.accentColorWarning;
    this.sendEmbed(textChannel, embed);
  }

  static async error(textChannel: TextChannel, embed: Embed) {
    if (embed.message !== undefined) {
      embed.message = `:exclamation: ` + embed.message;
    }
    embed.color = config.accentColorError;
    this.sendEmbed(textChannel, embed);
  }
}