import { TextChannel, User } from 'discord.js';
import { default as fauna, Client as FaunaClient } from 'faunadb';
import moment from 'moment';
import { Client } from '../client/client';

import { DatabaseEntry, UserEntry } from './user-entry';

import config from '../config.json';

const $ = fauna.query;

/// Interface for interaction with Fauna - a database API
export class Database {
  private userCache: Map<string, DatabaseEntry>;
  /// Keeps track of which user entries need to be updated remotely
  private updateCache: string[];
  private client: FaunaClient;

  constructor() {
    this.userCache = new Map();
    this.updateCache = [];
    this.client = new FaunaClient({secret: process.env.FAUNA_SECRET!});
    console.info('Established connection with Fauna.');
  }

  /// Create [user's] database entry
  async createDatabaseEntry(user: User): Promise<DatabaseEntry> {
    const response: any = await this.client.query(
      $.Call($.Function('CreateUser'), [user.username, user.id])
    );

    const databaseEntry = {
      user: response.data as UserEntry, 
      ref: response.ref
    };

    this.userCache.set(user.id, databaseEntry);

    return databaseEntry;
  }

  /// Remove a user's database entry
  removeDatabaseEntry(user: User) {
    this.client.query($.Delete($.Match($.Index('UserByID'), user.id)));

    this.userCache.delete(user.id);
    this.updateCache.splice(this.updateCache.findIndex((id) => id === user.id), 1);
  }

  /// Get a user's database entry if it exists, otherwise create it
  async fetchDatabaseEntryOrCreate(textChannel: TextChannel, user: User): Promise<DatabaseEntry | undefined> {
    let databaseEntry = this.userCache.get(user.id);
    
    if (databaseEntry === undefined) {
      try {
        const response: any = await this.client.query(
          $.Get($.Match($.Index('UserByID'), user.id))
        );
  
        databaseEntry = {user: response.data as UserEntry, ref: response.ref};
      } catch (error: any) {
        if (error.description !== 'Set not found.') {
          Client.severe(textChannel, `Failed to obtain or create user entry for ${user.tag}.`);
          return;
        }

        databaseEntry = await this.createDatabaseEntry(user);
      }
    }

    this.removeExpiredWarnings(databaseEntry);

    return databaseEntry;
  }

  /// Checks the timestamps of warnings the user received, and removes the ones
  /// that have expired based on the time of their submission
  removeExpiredWarnings(databaseEntry?: DatabaseEntry) {
    if (databaseEntry === undefined) {
      return;
    }

    const warnings: [string, [string, number]][] = Object.entries(databaseEntry.user.warnings);
    const now = moment();

    for (const warning of warnings) {
      const then = moment.unix(warning[1][1]);

      // If the warning has passed its expiry date, delete it
      if (now.diff(then, 'months') >= config.warningExpiryInMonths) {
        delete databaseEntry.user.warnings[warning[0]];
      }
    }
  }

  /// Update the remote user entry immediately
  async update(subject: DatabaseEntry) {
    try {
      await this.client.query(
        $.Update(subject.ref, {data: {warnings: subject.user.warnings}}),
      );
    } catch (error: any) {
      console.error(`${error.message} ~ ${error.description}`);
      console.error(Object.entries(error));
    }
  }

  /// Update the remote user entries which have been cached
  async commit() {
    const userEntries = Array.from(this.userCache.entries());
    if (userEntries.length === 0) return;

    await this.client.query(
      $.Do(userEntries.map(
        ([id, entry]) => $.Update($.Ref(id), {data: entry.user})
      ))
    );

    this.updateCache = [];
  }

  /// Increment the [target's] number of [thanks] and [caster's] [lastThanked] list with target
  /*
  async thankUser(textChannel: TextChannel, caster: User, target: User) {
    const casterEntry = await this.fetchUserEntryOrCreate(caster);
    const targetEntry = await this.fetchUserEntryOrCreate(target);

    // Get the time difference between now and the time the caster thanked the target
    const now = moment();
    const then = moment.unix(casterEntry.lastThanked.get(targetEntry.id) ?? now.unix());
    const hourDifference = now.diff(then, 'hours');

    // Checks if the caster is eligible to thank the target by checking if the caster
    // has already thanked the target in the last [config.thankInterval] hours.
    const isEligibleToVote = hourDifference >= config.thankIntervalInHours;
  
    if (!isEligibleToVote) {
      const hoursLeftToVote = config.thankIntervalInHours - hourDifference;
      Client.warn(textChannel, `You must wait ${hoursLeftToVote == 1 ? 'one more hour' : hoursLeftToVote + ' more hours'} to thank the same person again.`);
      return;
    }

    // Register the target in caster's [lastThanked] array
    casterEntry.lastThanked.set(targetEntry.id, now.unix());
    targetEntry.thanks += 1;

    // Update both the caster's and the target's entries
    await this.client.query(
      $.Do([
        $.Update($.Match($.Index('UserByID'), casterEntry.id), {data: {lastThanked: casterEntry.lastThanked}}),
        $.Update($.Match($.Index('UserByID'), targetEntry.id), {data: {thanks: targetEntry.thanks}}),
      ])
    );
  }
  */
}