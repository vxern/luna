import { TeacherModule } from "../module.js";
import { TeacherClient } from "../../teacher/teacher.js";
import { areSimilar } from "../../language.js";

export class ExtensionModule extends TeacherModule {
    async handleMessage(message) {
        if (areSimilar('info', message.content)) {
            this.displayInfo(message.guild, message.channel);
            return true;
        }

        return false;
    }

    async displayInfo(guild, textChannel) {
        TeacherClient.sendEmbed(textChannel, {
            title: guild.name,
            thumbnail: guild.iconURL(),
            fields: [
                {
                    name: 'Members',
                    value: guild.memberCount,
                },
                {
                    name: 'Channels',
                    value: guild.channels.cache.size,
                }
            ]
        });
    }
}