import { Guild, GuildMember, User as DiscordUser } from 'discord.js';
import { default as fauna, Client as FaunaClient } from 'faunadb';
import moment, { Moment } from 'moment';
import { Moderation } from '../modules/moderation/moderation';
import { Roles } from '../modules/roles/roles';

import { Document } from './structs/document';
import { Warning } from './structs/warning';

const $ = fauna.query;

/// Interface for interaction with Fauna - a database API
export class Database {
  private guild: Guild;
  /// To prevent Fauna from retrieving documents during every request, which would result
  /// in a very large amount of database calls, documents are cached
  private cachedDocuments: Map<string, Document> = new Map();
  /// Stores IDs of users' whose documents have not been updated remotely ('staged'), and are
  /// awaiting update ('commit')
  private cachedChanges: string[] = [];
  public muteTimeouts: Map<string, [NodeJS.Timeout, Function]> = new Map();
  private client: FaunaClient;

  constructor(guild: Guild) {
    this.guild = guild;
    this.client = new FaunaClient({secret: process.env.FAUNA_SECRET!});
    this.resumeMuteExpirations();
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

    if (response === undefined) return;

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
    document.user.warnings = document.user.warnings.filter(
      (warning) => !warning!.expiresAt.isBefore(now)
    );
  }

  async fetchMuted(): Promise<{ref: string, user: Document}[] | undefined> {
    const response = await this.dispatchQuery($.Map(
      $.Paginate(
        $.Documents($.Collection('MutedUsers'))
      ), 
      $.Lambda('ref', [
        $.Var('ref'), 
        $.Get($.Select(['data', 'user'], $.Get($.Var('ref'))))
      ])
    ));

    if (response === undefined) return;

    return Array.from<[string, any]>(response.data)
      .map(([ref, user]) => {
        return {
        ref: ref, 
        user: Document.deserialize(user)
      }});
  }

  async resumeMuteExpirations() {
    const mutedUsers = await this.fetchMuted();

    if (mutedUsers === undefined) return;

    const now = moment();

    // Remove documents showing a user is muted
    for (const muted of mutedUsers) {
      if (!muted.user.user.mute || muted.user.user.mute.expiresAt.isBefore(now)) {
        this.setMuteExpiry(muted.ref, muted.user, now);
        continue;
      }

      this.setMuteExpiry(muted.ref, muted.user, muted.user.user.mute!.expiresAt);
    }
  }

  async muteUser(member: GuildMember, document: Document, mute: Warning) {
    Roles.addRole(undefined, member, 'muted');

    document.user.mute = mute;
    this.update(document);

    const response = await this.dispatchQuery(
      $.Create($.Collection('MutedUsers'), {data: {user: document.ref}})
    );

    this.setMuteExpiry(response.ref, document, mute.expiresAt);
  }

  async setMuteExpiry(referenceToMutedDocument: string, document: Document, expiry: Moment) {
    let secondsLeft = expiry.unix() - moment().unix();
    secondsLeft = secondsLeft < 0 ? 0 : secondsLeft;
    
    const expire = () => this.expireMute(referenceToMutedDocument, document);

    this.muteTimeouts.set(
      document.user.id, 
      [setTimeout(expire, secondsLeft * 1000), expire]
    );
  }

  async expireMute(referenceToMutedDocument: string, document: Document) {
    document.user.mute = null;
    this.update(document);
    this.dispatchQuery($.Delete(referenceToMutedDocument));
    const member = (await Moderation.resolveMember(this.guild, document.user.id))!;
    Roles.removeRole(undefined, member, 'muted');
    console.debug('Stopped');
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