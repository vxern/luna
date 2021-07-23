import { Client as DiscordClient, TextChannel, Message } from 'discord.js';

import { Handler, LunaModule as LunaModule } from '../modules/module';
import { RolesModule } from '../modules/roles';

import { cyclePresence } from '../services/presence';
import { Embed } from '../structs/embed';
import { Language } from '../language';

import config from '../config.json';

export class LunaClient {
  private modules!: LunaModule[];
  private client: DiscordClient;

  constructor() {
    this.client = new DiscordClient();
    
    this.client.on('ready', () => this.initialize());
  }

  async initialize(): Promise<void> {
    cyclePresence(this.client.user!);

    this.client.on('message', (message) => this.handleMessage(message));

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

    // If the message was submitted in an excluded channel
    if (Language.removeNonAlphanumeric(message.channel.name) in config.excludedChannels) {
      return;
    }

    // Transform the message content into a digestible format
    let messageTrimmed: string = message.content.trim().replace(/ +/g, ' ');

    // If the message doesn't begin with the specified alias
    if (!messageTrimmed.toLowerCase().startsWith(config.alias) && 
        !config.aliaslessChannels.includes(message.channel.name)) {
      return;
    }

    // Remove the prefix to leave just the parsable content
    const args = messageTrimmed.split(' ');
    args.shift();
    message.content = args.join(' ');

    if (message.content.length === 0) {
      LunaClient.info(message.channel, new Embed({
        message: 'No command was provided',
      }));
      return;
    }
  
    this.resolveMessageToCommand(message);
  }

  async callHandlers(functionName: string, args: any[]): Promise<void> {
    const applicable = this.modules.filter((module) => functionName in module);

    applicable.forEach(async (module) => {
      if (await (module[functionName] as Handler)(args)) {
        return;
      }
    });
  }

  async resolveMessageToCommand(message: Message) {
    const args = message.content.split(' ');
    const foremostArgument = args[0];
    message.content = args.join(' ');


    // Find branches with a key corresponding to the foremost argument, with the [requirement]
    // yielding true and concatenate them into a single array
    const matchedBranches = ([] as [string, any][]).concat(...this.modules
      // Ensure that the module's [requirement] is met, otherwise exclude its [commandTree]
      .filter(async (module) => {
        let requirementMet: boolean;

        if (typeof module.requirement === 'boolean') {
          requirementMet = module.requirement;
        } else {
          requirementMet = await (module.requirement as Handler)();  
        }

        if (requirementMet) {
          module.args = {
            'textChannel': message.channel as TextChannel,
            'member': message.member,
            'message': message,
          }
        }

        return requirementMet;
      })
      // From each module extract its [commandTree] into entries
      .map((module) => Object.entries(module.commandTree))
      // Find branches which start either with an argument introducer or the command name
      .map((commandTreeBranches) => commandTreeBranches.filter(
        ([key, _]) => key.startsWith('%') || key === foremostArgument)
      )
    );

    // If branches have been found corresponding to the command
    if (matchedBranches.length === 0) {
      return;
    }

    for (const [command, callback] of matchedBranches) {
      let result;

      if (command.startsWith('%')) {
        result = await callback(message.content);
      } else {
        result = await callback();
      }

      if (result) {
        return;
      }
    }
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