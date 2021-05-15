import { default as fauna } from 'faunadb';
import { default as moment} from 'moment';

import { TeacherClient } from '../teacher/teacher.js';

import * as config from './database_config.js';

const q = fauna.query;

/// Acts as an interface for communication with Fauna
export class FaunaDatabase {
    constructor() {
        this.userCache = new Map();

        this.client = new fauna.Client({secret: process.env.FAUNA_SECRET});
        console.log('Established connection with Fauna.');
    }

    /// Creates a user entry in Fauna with default values
    async createUserEntry(userId) {
        const response = await this.dispatchQuery(
            q.Create(q.Collection('Users'), {
                data: {
                    userId: userId,
                    // This array will contain the IDs and timestamps of when a user was thanked
                    lastThanked: {},
                    thanks: 0,
                    activityPoints: 0,
                }
            })
        );

        // If Fauna returned an object with the user entry's data
        if (response.data !== undefined) {
            this.userCache.set(userId, response);
            return response;
        }

        return undefined;
    }

    /// Removes a user entry from Fauna
    async removeUserEntry(userId) {
        const response = await this.dispatchQuery(
            q.Delete(q.Match(q.Index('UserByID'), userId))
        );

        this.userCache.delete(userId);

        // If Fauna returned an object with the user entry's data
        if (response.data !== undefined) {
            return response;
        }

        return undefined;
    }

    /// Queries Fauna and returns the requested user's stats or otherwise creates the user entry if one does not exist
    async getUserInformation(userId) {
        if (this.userCache.has(userId)) {
            return this.userCache.get(userId);
        }

        let userInformation = await this.dispatchQuery(
            q.Get(q.Match(q.Index('UserByID'), userId))
        );

        if (userInformation === 'instance not found') {
            return await this.createUserEntry(userId);
        }
        
        return userInformation;
    }

    /// Increments the 'thanks' count of a user
    async thankUser(textChannel, originUserId, targetUserId) {
        const targetUser = await this.getUserInformation(targetUserId);
        const originUser = await this.getUserInformation(originUserId);
   
        // If either user has not been fetched correctly
        if (targetUser === undefined || originUser === undefined) {
            TeacherClient.sendError(textChannel, {
                message: `Couldn't fetch data of user #${targetUser === undefined ? targetUserId : originUserId}.`,
            });
            return false;
        }

        // Get the time difference between now and the time the thank was submitted for the user
        const now = moment();
        const then = moment.unix(originUser.data.lastThanked[targetUserId]);
        const hourDifference = now.diff(then, 'hours');

        // Checks if the origin user is eligible for thanking the target user by checking if the origin user has already thanked
        // them in the specified time frame, and if the origin user does not have the target user in their [lastThanked] map.
        const isEligibleToVote = 
            (isNaN(hourDifference) ? true : hourDifference >= config.default.thankCooldown) && 
            !(targetUserId in originUser.data.lastThanked);

        if (!isEligibleToVote) {
            TeacherClient.sendWarning(textChannel, {
                message: `You must wait ${config.default.thankCooldown} hours in order to thank the same person again.`,
            });
            return false;
        }
        
        // Add the target user's id as well as the timestamp to the [lastThanked] object
        originUser.data.lastThanked[targetUserId] = now.unix();

        // Update both users' entries
        const response = await this.dispatchQuery(
            q.Do([
                q.Update(targetUser.ref, {data: {thanks: targetUser.data.thanks += 1}}),
                q.Update(originUser.ref, {data: {lastThanked: originUser.data.lastThanked}})
            ])
        );
        
        this.userCache.set(targetUserId, response[0]);
        this.userCache.set(originUserId, response[1]);

        return true;
    }

    async dispatchQuery(query) {
        try {
            return await this.client.query(query);
        } catch (exception) {
            return exception.message;
        }
    }
}