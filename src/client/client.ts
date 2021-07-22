import { Client as DiscordClient, TextChannel, Message } from 'discord.js';

import { Handler, MynaModule } from '../modules/module';
import { RolesModule } from '../modules/roles';

import { cyclePresence } from '../services/presence';
import { Embed } from '../structs/embed';
import { Language } from '../language';

import config from '../config.json';

export class MynaClient {
  private modules!: Array<MynaModule>;
  private client: DiscordClient;

  constructor() {
    this.client = new DiscordClient();
    
    this.client.on('ready', () => this.initialize());
  }

  async initialize(): Promise<void> {
    cyclePresence(this.client.user!);

    this.client.on('message', (message: Message) => this.handleMessage(message));

    this.modules = [
      new RolesModule()
    ];

    console.info(`Myna is ready to serve with ${this.modules.length} modules.`);
  }

  async login(): Promise<void> {
    await this.client.login(process.env.DISCORD_SECRET);
  }

  async handleMessage(message: Message): Promise<void> {
    // If the message was submitted by a bot
    if (message.author.bot) {
      return;
    }

    // If the message was submitted by itself
    if (message.member!.id === this.client.user!.id) {
      return;
    }

    message.channel = message.channel as TextChannel;

    // If the message was submitted 
    if (!(Language.removeNonAlphanumeric(message.channel.name) in config.excludedChannels)) {
      return;
    }

    // Transform the message content into a digestible format
    let messageTrimmed: string = message.content.trim().replace(/ +/g, ' ');

    // If the message doesn't begin with the specified alias
    if (!messageTrimmed.toLowerCase().startsWith(config.alias)) {
      return;
    }

    // Remove the prefix to leave just the parsable content
    const args = messageTrimmed.split(' ');
    args.shift();
    message.content = args.join(' ');

    if (message.content.length === 0) {
      MynaClient.info(message.channel, new Embed({
        message: 'No command was provided',
      }));
      return;
    }
  
  this.callHandlers('handleMessage', [message]);
}

async callHandlers(functionName: string, args: Array<any>): Promise<void> {
  const applicable = this.modules.filter((module: MynaModule) => functionName in module);
  
  applicable.forEach(async (value: MynaModule) => {
    if (await (value[functionName] as Handler)(args)) {
      return;
    }
  });
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
      embed.message = `:information_source: ` + embed.message;
    }
    embed.color = config.accentColorTip;
    this.sendEmbed(textChannel, embed);
  }

  static async info(textChannel: TextChannel, embed: Embed) {
    if (embed.message !== undefined) {
      embed.message = `:bulb: ` + embed.message;
    }
    embed.color = config.accentColorNormal;
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