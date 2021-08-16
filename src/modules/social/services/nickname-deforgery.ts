import { Client } from "../../../client/client";

import { Service } from "../../service";

import { Social } from "../social";

export class NicknameDeforgery extends Service<Social> {
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