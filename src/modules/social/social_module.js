import { TeacherModule } from "../module.js";
import { TeacherClient } from "../../teacher/teacher.js";
import { FaunaDatabase } from "../../fauna/database.js";
import { areSimilar } from "../../language.js";

const userIdentifierMatch = /<@!?([0-9]+)>/;

export class SocialModule extends TeacherModule {
    constructor(database) {
        super();
        this.database = database;
    }

    async handleMessage(message) {
        return await super.resolveCommand(message.content, {
            'thank': {
                '$targetUserIdentifier': async (targetUserIdentifier) => await this.thankUser(message.channel, message.member.user, targetUserIdentifier),
            },
            'leaderboard': async () => await this.displayLeaderboard(message.channel),
        });
    }

    async displayLeaderboard() {
        
    }

    async thankUser(textChannel, originUser, targetUserIdentifier) {
        if (!targetUserIdentifier.match(userIdentifierMatch)) {
            TeacherClient.sendWarning(textChannel, {
                message: 'A user may only be thanked by providing their tag.',
            });
            return;
        }

        const userId = targetUserIdentifier.match(userIdentifierMatch)[1];

        if (originUser.id === userId) {
            TeacherClient.sendWarning(textChannel, {
                message: 'You may not thank yourself.',
            });
            return;
        }

        if (!textChannel.guild.members.cache.find((member) => member.user.id === userId)) {
            TeacherClient.sendWarning(textChannel, {
                message: 'The tag you provided does not point to any valid user in this server.',
            });
            return;
        }

        if (!(await this.database.thankUser(textChannel, originUser.id, userId))) {
            return;
        }

        const userThanks = (await this.database.getUserInformation(userId)).data.thanks;

        TeacherClient.sendEmbed(textChannel, {
            message: `${originUser} has thanked ${targetUserIdentifier}. :star:` +
                        `\n\n${targetUserIdentifier} now has ${userThanks} ${userThanks > 1 ? 'thanks' : 'thank'}.`,
        });
    }
}