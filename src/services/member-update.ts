import { GuildMember } from "discord.js";
import { Client } from "../client/client";
import { Social } from "../modules/social/social";

import { Service } from "./service";

export class MemberUpdate extends Service {
  async initialise() {
    // Hijack nickname updates to override them
    Client.bot.client.on('guildMemberUpdate', async (memberUnfetched) => {
      const member = await memberUnfetched.fetch();

      // Member does not have a nickname
      if (member.nickname === null) return;

      Client.database.fetchOrCreateDocument(member.user!).then((document) => {
        Social.assignEmoji(document, member);
      });
    });
  }
}