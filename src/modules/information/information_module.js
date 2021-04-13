import { TeacherModule } from "../module.js";
import { TeacherClient } from "../../teacher/teacher.js";

import * as config from './information.js';

export class InformationModule extends TeacherModule {
    constructor(Client) {
        super();
        
        this.joinsAndLeaves = this.channelByName(Client.channels.cache, config.default.joinsAndLeaves);
        this.bans = this.channelByName(Client.channels.cache, config.default.bans);

        Client.on('guildMemberAdd', (member) => this.handleJoin(member));

        Client.on('guildMemberRemove', (member) => this.handleLeave(member));

        Client.on('guildBanAdd', (_, member) => this.handleBan(member));

        Client.on('guildBanRemove', (_, member) => this.handleUnban(member));
    }

    /// Handles users joining
    async handleJoin(member) {
        if (this.joinsAndLeaves === undefined) {
            return;
        }

        TeacherClient.sendEmbed(this.joinsAndLeaves, {
            message: `${member.user.username} joined! :grin:`,
            color: 0x00bd68,
        });
    }

    /// Handles users leaving
    async handleLeave(member) {
        if (this.joinsAndLeaves === undefined) {
            return;
        }

        TeacherClient.sendEmbed(this.joinsAndLeaves, {
            message: `${member.user.username} left. :sob:`,
            color: 0xe82d20,
        });
    }

    /// Handles users being banned
    async handleBan(member) {
        if (this.bans === undefined) {
            return;
        }

        TeacherClient.sendEmbed(this.bans, {
            message: `${member.user.username} was banned. :sob:`,
            color: 0xe82d20,
        });
    }

    /// Handles users being unbanned
    async handleUnban(member) {
        if (this.bans === undefined) {
            return;
        }

        TeacherClient.sendEmbed(this.bans, {
            message: `${member.user.username} was unbanned. :sob:`,
            color: 0xe82d20,
        });
    }
}