import { TeacherModule } from "../module.js";
import { TeacherClient } from "../../teacher/teacher.js";

import * as config from './social_config.js';

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
        });
    }

    async thankUser(textChannel, originUser, targetUserIdentifier) {
        if (!targetUserIdentifier.match(userIdentifierMatch)) {
            TeacherClient.sendWarning(textChannel, {
                message: 'A user may only be thanked by providing their tag.',
            });
            return;
        }

        const userId = targetUserIdentifier.match(userIdentifierMatch)[1];
        const targetMember = textChannel.guild.members.cache.find((member) => member.id === userId);

        if (originUser.id === userId) {
            TeacherClient.sendWarning(textChannel, {
                message: 'You may not thank yourself.',
            });
            return;
        }

        if (originUser.bot || targetMember.user.bot) {
            TeacherClient.sendWarning(textChannel, {
                message: 'Bots cannot participate in thanking.',
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

        const usernamePreviousUnsanitised = targetMember.nickname ?? targetMember.user.username;
        const usernamePrevious = userThanks > Object.keys(config.default.tiers)[0] ? usernamePreviousUnsanitised.split(' ').splice(1).join(' ') : usernamePreviousUnsanitised;
        
        // If a user has crossed a thank tier threshold, reward them with it
        for (const tier of Object.entries(config.default.tiers).reverse()) {
            if (userThanks >= tier[0]) {
                // TODO: The original nickname could be 32 characters long, which is the limit
                targetMember.setNickname(`${tier[1]} ${usernamePrevious}`);
                break;
            }
        }

        TeacherClient.sendEmbed(textChannel, {
            message: `${originUser} has thanked ${targetUserIdentifier}. :star:` +
                        `\n\n${targetUserIdentifier} now has ${userThanks} ${userThanks > 1 ? 'thanks' : 'thank'}.`,
        });
    }
}