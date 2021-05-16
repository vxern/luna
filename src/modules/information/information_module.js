import { TeacherModule } from "../module.js";
import { TeacherClient } from "../../teacher/teacher.js";

import * as config from './information_config.js';

const joinedSymbol = '+';
const leftSymbol = '-';
const bannedSymbol = '!';
const unbannedSymbol = '!~';

export class InformationModule extends TeacherModule {
    constructor(Client) {
        super();

        this.logs = this.channelByName(Client.channels.cache, config.default.logs);

        // `logs` must not be undefined
        if (this.logs === undefined) {
            console.error('A logging channel has not been specified.');
            process.exit(1);
        }
    }

    /// Handles users joining
    async handleJoin(member) {
        this.log(`[${joinedSymbol}] ${member.user.username} joined.`);
    }

    /// Handles users leaving
    async handleLeave(member) {
        this.log(`[${leftSymbol}] ${member.user.username} left.`);
    }

    /// Handles users being banned
    async handleBan(user) {
        this.log(`[${bannedSymbol}] ${user.username} was banned.`);
    }

    /// Handles users being unbanned
    async handleUnban(user) {
        this.log(`[${unbannedSymbol}] ${user.username} was unbanned.`);
    }

    /// Writes a log message to the log channel
    async log(message) {
        TeacherClient.sendEmbed(this.logs, {
            message: message,
        });
    }
}