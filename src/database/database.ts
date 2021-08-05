import { TextChannel, User } from 'discord.js';
import { default as fauna, Client as FaunaClient } from 'faunadb';
import moment from 'moment';
import { Client } from '../client/client';

import { DatabaseEntry, UserEntry } from './user-entry';

import config from '../config.json';

const $ = fauna.query;

/// Interface for interaction with Fauna - a database API
export class Database {
  private databaseCache: Map<string, DatabaseEntry>;
  /// Keeps track of which user entries need to be updated remotely
  private stagedCache: string[];
  private client: FaunaClient;

  constructor() {
    this.databaseCache = new Map();
    this.stagedCache = [];
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

    this.databaseCache.set(user.id, databaseEntry);

    return databaseEntry;
  }

  /// Remove a user's database entry
  removeDatabaseEntry(user: User) {
    this.client.query($.Delete($.Match($.Index('UserByID'), user.id)));

    this.databaseCache.delete(user.id);
    this.stagedCache.splice(this.stagedCache.findIndex((id) => id === user.id), 1);
  }

  /// Get a user's database entry if it exists, otherwise create it
  async fetchDatabaseEntryOrCreate(user: User): Promise<DatabaseEntry | undefined> {
    let databaseEntry = this.databaseCache.get(user.id);
    
    if (databaseEntry === undefined) {
      await this.dispatchQuery($.Get($.Match($.Index('UserByID'), user.id)));

      if (this.databaseCache.has(user.id)) {
        return await this.fetchDatabaseEntryOrCreate(user);
      }

      databaseEntry = await this.createDatabaseEntry(user);
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
      if (warning[1] === null) {
        continue;
      }

      const then = moment.unix(warning[1][1]);

      // If the warning has passed its expiry date, delete it
      if (now.diff(then, 'months') >= config.warningExpiryInMonths) {
        databaseEntry.user.warnings[warning[0]] = null;
      }
    }
  }

  /// Update the remote entry immediately
  async stage(entry: DatabaseEntry, commitImmediately: boolean = false) {
    const userId = entry.user.id;

    if (commitImmediately) {
      this.commit(entry);
      return;
    }

    // Update the cache entry for the user
    this.databaseCache.set(userId, entry);

    if (!this.stagedCache.includes(userId)) {
      // Mark the database entry as ready for committing
      this.stagedCache.push(userId);
    }
  }

  async commit(entry: DatabaseEntry) {
    this.dispatchQuery($.Update(entry.ref, {data: entry.user}));
  }

  /// Commit database entries which have been cached earlier
  async commitAll() {
    const databaseEntries = this.stagedCache.map((id) => this.databaseCache.get(id)!);
    if (databaseEntries.length === 0) return;

    this.stagedCache = [];

    this.dispatchQuery(
      $.Do(databaseEntries.map(
        (entry) => $.Update(entry.ref, {data: entry.user})
      ))
    );
  }

  /// Attempts to dispatch query, and logs error if one has been caught
  async dispatchQuery(expression: fauna.Expr) {
    try {
      // Update remote entries
      this.updateEntries(await this.client.query(expression));
    } catch (error: any) {
      if (error.description === 'Set not found.') {
        return;
      }

      console.error(`${error.message} ~ ${error.description}`);
    }
  }

  updateEntries(response: any) {
    if (!Array.isArray(response)) {
      this.databaseCache.set(response.data.id, this.fromResponse(response));
      return;
    }

    const responses = Array.from(response);
    for (const response of responses) {
      this.databaseCache.set(response.data.id, this.fromResponse(response));
    }
  }

  fromResponse(response: any): DatabaseEntry {
    return {user: response.data as UserEntry, ref: response.ref};
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