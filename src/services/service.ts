import { ClientUser } from "discord.js";

export class Service {
  protected readonly bot: ClientUser;

  constructor(bot: ClientUser) {
    this.bot = bot;
  }
}