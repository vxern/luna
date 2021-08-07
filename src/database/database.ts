import { User as DiscordUser } from 'discord.js';
import { default as fauna, Client as FaunaClient } from 'faunadb';
import moment from 'moment';

import { Document } from './structs/document';

const $ = fauna.query;

/// Interface for interaction with Fauna - a database API
export class Database {
  /// To prevent Fauna from retrieving documents during every request, which would result
  /// in a very large amount of database calls, documents are cached
  private cachedDocuments: Map<string, Document>;
  /// Stores IDs of users' whose documents have not been updated remotely ('staged'), and are
  /// awaiting update ('commit')
  private cachedChanges: string[];
  private client: FaunaClient;

  constructor() {
    this.cachedDocuments = new Map();
    this.cachedChanges = [];
    this.client = new FaunaClient({secret: process.env.FAUNA_SECRET!});
    console.info('Established connection with Fauna.');
  }

  /// Cache the document and add it to array of changes cached for later update
  async cache(document: Document) {
    const id = document.user.id;

    // Cached document
    this.cachedDocuments.set(id, document);

    // Add ID of document to array of cached changes
    if (!this.cachedChanges.includes(id)) {
      this.cachedChanges.push(id);
    }
  }

  /// Update remote document and cache it locally
  async update(document: Document) {
    // Cache document
    this.cachedDocuments.set(document.user.id, document);

    this.dispatchQuery($.Update(document.ref, {data: document.user.serialize()}));
  }

  /// Update cached changes and clear the array of cached changes
  async updateCached() {
    if (this.cachedChanges.length === 0) return;

    const cachedDocuments = this.cachedChanges.map((id) => this.cachedDocuments.get(id)!);
    const updateCalls = cachedDocuments
      .map((document) => $.Update(document.ref, {data: document.user.serialize()}));

    this.cachedChanges = [];

    this.dispatchQuery($.Do(updateCalls));
  }

  /// Attempts to dispatch query, and logs error if one has been caught
  async dispatchQuery(expression: fauna.Expr): Promise<any> {
    try {
      return await this.client.query(expression);
    } catch (error: any) {
      if (error.description === 'Set not found.') return;
      console.error(`${error.message} ~ ${error.description}`);
    }
  }

  cacheDocuments(response: any) {
    if (!Array.isArray(response)) {
      this.cachedDocuments.set(response.data.id, Document.deserialize(response));
      return;
    }

    const responses = Array.from(response);
    for (const response of responses) {
      this.cachedDocuments.set(response.data.id, Document.deserialize(response));
    }
  }

  /// Creates a document for [user] and stores it in cache
  async createDocument(user: DiscordUser): Promise<Document> {
    // Create remote document
    const response: any = await this.dispatchQuery(
      $.Call($.Function('CreateUser'), [user.tag, user.id])
    );

    // Cache document locally
    const document = Document.deserialize(response);
    this.cachedDocuments.set(user.id, document);

    return document;
  }

  /// Deletes remote document of [user], and deletes the document from cache
  deleteDocument(user: DiscordUser) {
    // Delete remote document
    this.dispatchQuery($.Delete($.Match($.Index('UserByID'), user.id)));

    // Delete cached local document
    this.cachedDocuments.delete(user.id);

    // Delete uncommitted cached changes
    this.cachedChanges.splice(this.cachedChanges.findIndex((id) => id === user.id), 1);
  }

  /// Fetches cached document of [user], or fetches remote document
  async fetchDocument(user: DiscordUser): Promise<Document | undefined> {
    if (this.cachedDocuments.has(user.id)) {
      return this.cachedDocuments.get(user.id)!;
    }

    const response = await this.dispatchQuery(
      $.Get($.Match($.Index('UserByID'), user.id))
    );

    if (response === undefined) {
      return;
    }

    const document = Document.deserialize(response);
    this.cachedDocuments.set(user.id, document);
    return document;
  }

  /// Fetches remote document of [user], or creates a document if one does not exist
  async fetchOrCreateDocument(user: DiscordUser): Promise<Document> {
    const document = await this.fetchDocument(user) ?? await this.createDocument(user);

    // Preprocessing the document before returning it
    this.removeExpiredWarnings(document);

    return document;
  }

  /// Removes warnings which have pas
  async removeExpiredWarnings(document: Document) {
    const now = moment();
    // Filter out the warnings which are still due to expire in the future
    document.user.warnings = document.user.warnings.filter((warning) => warning!.expiresAt.isAfter(now));
  }

  /*
  async getMutedUsers(): Promise<[string, DatabaseEntry][] | undefined> {
    // Get user entries of muted users
    const response = await this.dispatchQuery($.Map(
      $.Paginate(
        $.Documents($.Collection('MutedUsers'))
      ), 
      $.Lambda('ref', [
        $.Var('ref'), 
        $.Get($.Select(['data', 'user'], $.Get($.Var('ref'))))
      ])
    ), false);

    if (response === undefined) {
      return;
    }

    return Array.from<[string, any]>(response).map(([ref, entry]) => [ref, this.fromResponse(entry)]);
  }

  /// Checks the timestamps of mutes the user received, and removes the ones
  /// that have expired based on the time of their submission
  async removeExpiredMutes() {
    const mutes = await this.getMutedUsers();

    if (mutes === undefined) {
      return;
    }

    const now = moment();

    for (const [referenceToMute, databaseEntry] of mutes) {
      const mute = Object(databaseEntry.user.mute);

      if (!mute.isMuted || mute.information === undefined) {
        this.dispatchQuery($.Delete(referenceToMute));
        continue;
      }

      // If the mute has passed its expiry date, delete it
      if (now.diff(mute.information.mutedAt, 'seconds') >= mute.information.mutedFor) {
        continue;
      }

      // Otherwise, create a time interval after which the mute will be deleted
      this.createMuteExpiry(databaseEntry, referenceToMute, mute);
    }
  }

  async createMute(databaseEntry: DatabaseEntry) {
    this.dispatchQuery($.Create($.Collection("MutedUsers"), {
      data: {
        username: "vxern#3689",
        ref: databaseEntry.ref
      }
    }))
  }

  async createMuteExpiry(databaseEntry: DatabaseEntry, referenceToMute: string, mute: MuteData) {
    let remainingSeconds = 
      moment.now() - 
      mute.information!.mutedAt.unix() - 
      mute.information!.mutedFor;
    if (remainingSeconds < 0) remainingSeconds = 0;

    setTimeout(() => {
      const blankMute = MuteData.none();
      databaseEntry.user.mute = blankMute.serialize();

      this.dispatchQuery($.Delete(referenceToMute));
      this.stage(databaseEntry, true);

      console.debug(`${databaseEntry.user.username} has been automatically unmuted after having been muted for: ${mute.information!.reason}`);
    }, remainingSeconds);
  }
  */
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