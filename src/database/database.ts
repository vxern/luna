import { ClientUser, TextChannel } from 'discord.js';
import { default as fauna, Client as FaunaClient } from 'faunadb';
import { default as moment } from 'moment';

import { LunaClient } from '../client/client';
import { Embed } from '../structs/embed';

import config from '../config.json';

const $ = fauna.query;

export class FaunaDatabase {
  private userCache: Map<string, UserEntry>;
  private client: FaunaClient;

  constructor() {
    this.userCache = new Map();
    this.client = new FaunaClient({secret: process.env.FAUNA_SECRET!});
  }

  async createUserEntry(user: ClientUser): Promise<UserEntry | undefined> {
    const response: any = await this.client.query(
      $.Call($.Function('CreateUser'), { 
        data: {
          username: user.username,
          userId: user.id,
        }
      })
    );

    if (!response.hasOwnProperty('data')) {
      return undefined;
    }

    const userEntry: UserEntry = response.data as UserEntry;

    this.userCache.set(user.id, userEntry);

    return userEntry;
  }

  removeUserEntry(user: ClientUser): void {
    this.client.query($.Delete($.Match($.Index('User'), user.id)));

    this.userCache.delete(user.id);
  }

  async fetchUserEntryOrCreate(user: ClientUser): Promise<UserEntry | undefined> {
    if (this.userCache.has(user.id)) {
      return this.userCache.get(user.id)!;
    }

    const response: any = await this.client.query(
      $.Get($.Match($.Index('UserByID'), user.id))
    );

    if (response === 'instance not found') {
      return await this.createUserEntry(user);
    }

    return response.data as UserEntry;
  }

  async thankUser(textChannel: TextChannel, caster: ClientUser, target: ClientUser): Promise<boolean> {
    const casterEntry = await this.fetchUserEntryOrCreate(caster);
    const targetEntry = await this.fetchUserEntryOrCreate(target);

    // Both entries must exist to proceed with thanking
    if (casterEntry === undefined || targetEntry === undefined) {
      LunaClient.error(textChannel, new Embed({
        message: `Couldn't fetch data of user #${casterEntry === undefined ? casterEntry!.id : targetEntry!.id }.`
      }));
      return false;
    }

    // Get the time difference between now and the time the caster thanked the target
    const now = moment();
    const then = moment.unix(casterEntry.lastThanked.get(targetEntry.id) ?? now.unix());
    const hourDifference = now.diff(then, 'hours');

    // Checks if the caster is eligible to thank the target by checking if the caster
    // has already thanked the target in the last [config.thankInterval] hours.
    const isEligibleToVote = hourDifference >= config.thankIntervalInHours;
  
    if (!isEligibleToVote) {
      const hoursLeftToVote = config.thankIntervalInHours - hourDifference;
      LunaClient.warn(textChannel, new Embed({
        message: `You must wait ${hoursLeftToVote == 1 ? 'one more hour' : hoursLeftToVote + ' more hours'} to thank the same person again.`
      }));
      return false;
    }

    // Register the target in caster's [lastThanked] array
    casterEntry.lastThanked.set(targetEntry.id, now.unix());

    // Increment target's [thanks]
    targetEntry.thanks += 1;

    // Update both the caster's and the target's entries
    const response: any = await this.client.query(
      $.Do([
        $.Update($.Match($.Index('UserByID'), casterEntry.id), {data: {lastThanked: casterEntry.lastThanked}}),
        $.Update($.Match($.Index('UserByID'), targetEntry.id), {data: {thanks: targetEntry.thanks}}),
      ])
    );

    return true;
  }
}