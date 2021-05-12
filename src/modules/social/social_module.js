import { TeacherModule } from "../module.js";
import { TeacherClient } from "../../teacher/teacher.js";
import { FaunaDatabase } from "../../fauna/database.js";
import { areSimilar } from "../../language.js";

export class SocialModule extends TeacherModule {
    constructor(database) {
        super();
        this.database = database;
    }

    async handleMessage(message) {
        return await super.resolveCommand(message.content, {
            'thank': {
                '$userIdentifier': async (userIdentifier) => await this.thankUser(message.channel, message.member.user, userIdentifier),
            },
        });
    }

    async thankUser(textChannel, originUser, userIdentifier) {
        if (userIdentifier.startsWith('<@!') && userIdentifier.endsWith('>')) {
            const userId = userIdentifier.substring(3, userIdentifier.length - 1);

            this.database.thankUser(textChannel, userId);

            TeacherClient.sendEmbed(textChannel, {
                message: `${originUser} has thanked ${userIdentifier}. :star:` +
                         `\n\n${userIdentifier} now has ${(await this.database.getUserInformation(userId)).data.thanks} thank/s.`,
            });
            return true;
        }

        let username = userIdentifier;

        // If the user identifier contains a tag, remove it
        if (userIdentifier.includes('#')) {
            username = userIdentifier.split('#')[0];
        }

        // Find the member object by username
        const targetMember = textChannel.guild.members.cache.find((member) => (areSimilar(member.user.username, username) || (member.nickname !== null ? areSimilar(member.nickname, username) : false)));

        if (targetMember === undefined) {
            TeacherClient.sendError(textChannel, {
                message: `Could not find a user with the specified user identifier`,
            });
            return;
        }

        const targetUser = targetMember.user;

        await this.database.addThank(textChannel, targetUser.id);

        TeacherClient.sendEmbed(textChannel, {
            message: `${originUser} has thanked ${targetUser}. :star:` +
                     `\n\n${targetUser} now has ${(await this.database.getUserInformation(targetUser.id)).data.thanks} thank/s.`,
        });
    }
}