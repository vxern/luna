import { TeacherModule } from "../module.js";
import { TeacherClient } from "../../teacher/teacher.js";

import * as teacherConfig from '../../teacher/teacher_config.js';
import * as config from './information.js';

export class InformationModule extends TeacherModule {
    constructor(Client) {
        super();
        
        this.joinsAndLeaves = this.channelByName(Client.channels.cache, config.default.joinsAndLeaves);
        this.bans = this.channelByName(Client.channels.cache, config.default.bans);

        Client.on('guildMemberAdd', (member) => this.handleJoin(member));

        Client.on('guildMemberRemove', (member) => this.handleLeave(member));

        Client.on('guildBanAdd', (_, user) => this.handleBan(user));

        Client.on('guildBanRemove', (_, user) => this.handleUnban(user));
    }

    /// Handles users joining
    async handleJoin(member) {
        if (this.joinsAndLeaves === undefined) {
            return;
        }

        TeacherClient.sendEmbed(this.joinsAndLeaves, {
            message: `${member.user.username} joined! :grin:`,
            color: teacherConfig.default.accentColorGreen,
        });
    }

    /// Handles users leaving
    async handleLeave(member) {
        if (this.joinsAndLeaves === undefined) {
            return;
        }

        TeacherClient.sendEmbed(this.joinsAndLeaves, {
            message: `${member.user.username} left. :sob:`,
            color: teacherConfig.default.accentColorRed,
        });
    }

    /// Handles users being banned
    async handleBan(user) {
        if (this.bans === undefined) {
            return;
        }

        TeacherClient.sendEmbed(this.bans, {
            message: `${user.username} was banned. :sob:`,
            color: teacherConfig.default.accentColorRed,
        });
    }

    /// Handles users being unbanned
    async handleUnban(user) {
        if (this.bans === undefined) {
            return;
        }

        TeacherClient.sendEmbed(this.bans, {
            message: `${user.username} was unbanned. :grin:`,
            color: teacherConfig.default.accentColorGreen,
        });
    }
}