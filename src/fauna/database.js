import { default as fauna } from 'faunadb';

import { TeacherClient } from '../teacher/teacher.js';

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
                    userID: userId,
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
        console.log(this.userCache.has(userId));

        if (this.userCache.has(userId)) {
            return this.userCache.get(userId);
        }

        let userInformation = await this.dispatchQuery(
            q.Get(q.Match(q.Index('UserByID'), userId))
        );

        if (userInformation === 'instance not found') {
            userInformation = await this.createUserEntry(userId);
        }

        this.userCache.set(userId, userInformation);
        console.log(this.userCache.has(userId));
        
        return userInformation;
    }

    /// Increments the 'thanks' count of a user
    async thankUser(textChannel, userId) {
        const user = await this.getUserInformation(userId);

        if (user === undefined) {
            TeacherClient.sendError(textChannel, {
                message: `Couldn't fetch data of user #${userId}`,
            });
            return;
        }

        const response = await this.dispatchQuery(
            q.Update(user.ref, {data: {thanks: user.data.thanks += 1}})
        );

        if (response.data === undefined) {
            TeacherClient.sendError(textChannel, {
                message: `Couldn't update data of user #${userId}`,
            });
            return;
        }

        this.userCache.set(userId, response);
    }

    async dispatchQuery(query) {
        try {
            return await this.client.query(query);
        } catch (exception) {
            return exception.message;
        }
    }
}