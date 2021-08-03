import { GuildMember, Message, TextChannel, VoiceChannel, VoiceConnection } from "discord.js";

import { Client } from "../../client/client";

import { Module } from "../module";
import { Song, Listing } from "./songs";

import { Forward } from './commands/forward';
import { History } from './commands/history';
import { Now } from "./commands/now";
import { Pause } from "./commands/pause";
import { Play } from "./commands/play";
import { Queue } from "./commands/queue";
import { Remove } from "./commands/remove";
import { Replay } from "./commands/replay";
import { Rewind } from "./commands/rewind";
import { Skip } from "./commands/skip";
import { Unpause } from "./commands/unpause";
import { Unskip } from "./commands/unskip";
import { Volume } from "./commands/volume";

import { Utils } from "../../utils";

export class Music extends Module {
  readonly requirement = (message: Message) => this.verifyVoiceChannel(message.channel as TextChannel, message.member!);
  readonly commandsRestricted = Utils.instantiate([
    Forward, Pause, Play, Remove, Replay, Rewind, Skip, Unpause, Unskip, Volume
  ], [this]);
  readonly commandUnrestricted = Utils.instantiate([
    History, Now, Queue,
  ], [this]);

  /// Text channel the last interaction with the bot occurred in
  textChannel: TextChannel | undefined;
  /// Voice channel music is being played in
  voiceChannel: VoiceChannel | undefined;
  voiceConnection!: VoiceConnection;

  /// Current playing song
  currentSong: Song | undefined;
  /// Current playing song's / collection's listing
  currentListing: Listing | undefined;
  /// Upcoming songs
  queue: Listing[] = [];
  /// Previously played songs
  history: Listing[] = [];

  /// When `true`, the song playing will keep replaying
  loop: boolean = false;

  /// 0 = no sound, 1 = 100%, 1.5 = 150%
  volume: number = 1;

  /// Determines whether the controller is occupied or not
  isPlaying(): boolean {
    return this.currentSong !== undefined;
  }

  /// Returns a list of IDs of users present in the voice channel at the time of execution
  usersPresent(): string[] {
    return this.voiceChannel!.members.map((member) => member.id)
      // Remove the bot's id
      .filter((id) => id !== Client.bot.id);
  }

  /// Converts the stream time (milliseconds) to seconds
  streamTimeInSeconds(): number {
    return Math.floor(this.voiceConnection!.dispatcher.streamTime / 1000);
  }

  /// Return the current song's running time together with the song's duration as a string 
  runningTimeAsString(): string {
    return Utils.convertSecondsToExtendedFormat(
      this.currentSong!.offset + this.streamTimeInSeconds()
    ) + ' / ' + Utils.convertSecondsToExtendedFormat(this.currentSong!.duration);
  }

  /// Validates that the user can use the music module as a whole
  /// by checking if they're in the same voice channel
  verifyVoiceChannel(textChannel: TextChannel, member: GuildMember): boolean {
    const voiceChannel: VoiceChannel = member.voice.channel!;
    
    // If the user is not present in any channel
    if (voiceChannel === null) {
      Client.warn(textChannel, 'To use this command, you must first join a voice channel.');
      return false;
    }

    // If the bot has not joined any voice channel yet
    if (this.voiceChannel === undefined) {
      return true;
    }

    // If the user's voice channel is not the same as the bot's voice channel
    if (voiceChannel.id !== this.voiceChannel.id) {
      Client.warn(textChannel, 'You need to be in the same voice channel as myself to use this command.');
      return false;
    }

    return true;
  }

  async bindToVoiceChannel(textChannel: TextChannel, voiceChannel: VoiceChannel) {
    if (this.voiceChannel !== undefined) return;

    this.textChannel = textChannel;
    this.voiceChannel = voiceChannel;
    this.voiceConnection = await this.voiceChannel.join();
  }

  /// Determines whether the user can manage a song based on whether
  /// they have been present in the voice channel when the song was requested
  canUserManageListing(textChannel: TextChannel, userId: string, listing: Listing): boolean {
    if (!listing.songManagers.includes(userId) && 
        /// If all the users who could manage the song are no longer present, the
        /// song will automatically be unlocked.
        this.usersPresent().some((userId) => listing.songManagers.includes(userId))) {
      Client.warn(textChannel, `You cannot manage a song which has been requested in your absence.`);
      return false;
    }

    return true;
  }
}