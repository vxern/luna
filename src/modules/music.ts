import { Message, TextChannel, VoiceChannel, VoiceConnection } from "discord.js";
import { VideoEntry, YTSearcher } from "ytsearcher";
import ytdl from 'ytdl-core';

import { LunaClient } from "../client/client";
import { LunaModule } from "./module";
import { Embed } from "../structs/embed";

import config from '../config.json';
import { Language } from "../language";

// const youtubeUrlPattern: RegExp = /http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?‌​[\w\?‌​=]*)?/;

type SongHandler = (songOrNone?: Song) => Promise<boolean>;

export class MusicModule extends LunaModule {
  readonly requirement = () => this.checkVoiceChannel();
  readonly beforeExecutingCommand = () => this.updateMusicController();
  readonly commandTree = {
    'play ~ Play music either by providing URL or searching using keywords': 
      async (songName: string) => await this.onRequested(await this.search(songName)),
    'replay ~ Start playing the current song from the start': async () => await this.unimplemented(),
    'pause ~ Pause or unpause the current song': async () => await this.unimplemented(),
    'unpause ~ Unpause the current song': async () => await this.unimplemented(),
    'skip ~ Skip the current song': async () => await this.unimplemented(),
    'unskip ~ Return to the previous running song': async () => await this.unimplemented(),
    
    "add ~ Add a song to the back of the queue": async () => await this.unimplemented(),
    'remove ~ Remove a song from the queue using its index': async () => await this.unimplemented(),
    'queue ~ Display the list of queued songs': async () => await this.unimplemented(),

    'forward ~ Fast-forward the song by a given duration': async () => await this.unimplemented(),
    'rewind ~ Rewind the song by a given duration': async () => await this.unimplemented(),

    'volume ~ Display or set the current volume': {
      '': async () => await this.unimplemented(),
      '$volume': async () => await this.unimplemented(),
    }
  };
  
  /// Determines what should happen when the user requests to play a song
  onRequested: SongHandler = this.play;

  readonly musicController = new MusicController();

  async updateMusicController() {
    if (this.musicController.isOccupied()) {
      this.whenRequested = this.addToQueue;
      return;
    }

    this.whenRequested = this.play;

    this.musicController.textChannel = this.args['textChannel'];
    this.musicController.voiceChannel = this.args['voiceChannel'];
    this.musicController.voiceConnection = await this.musicController.voiceChannel?.join();
  }

  async search(songName: string): Promise<Song | undefined> {
    if (songName.length === 0) {
      LunaClient.warn(this.musicController.textChannel!, new Embed({
        message: 'You did not provide a song name',
      }));
      return;
    }

    // const youtubeUrl = youtubeUrlPattern.exec(songName)?.shift();

    const searchResults = (await this.musicController.searcher.search(songName)).currentPage?.slice(0, config.maximumSearchResults);

    if (searchResults === undefined) {
      LunaClient.warn(this.musicController.textChannel!, new Embed({
        message: 'There are no videos found for your requested song',
      }));
      return;
    }

    LunaClient.info(this.musicController.textChannel!, Embed.singleField({
      name: 'Select a song below by writing its index',
      value: searchResults.map((result, index) => index + 1 + ' ~ ' + Language.highlightKeywords(result.title, songName)).join('\n\n'),
      inline: false,
    }));

    const message = await this.musicController.textChannel?.awaitMessages(
      (message: Message) => message.author.id === this.args['member'].id,
      { max: 1, time: config.queryTimeout * 1000 },
    ).catch();

    let index = Number(message?.first()?.content);

    if (!this.validateIndex(index, searchResults)) {
      return;
    }

    return new Song({
      video: searchResults[index - 1],
      canBeManagedBy: this.musicController.voiceChannel?.members.map((member) => member.id),
    });
  }

  async play(song?: Song): Promise<boolean> {
    if (song !== undefined && this.musicController.isOccupied()) {
      return true;
    }

    this.musicController.history.push(this.musicController.currentSong!);

    if (song === undefined) {
      if (this.musicController.songQueue.length === 0) {
        return true;
      }

      this.musicController.currentSong = this.musicController.songQueue.shift();
    } else {
      this.musicController.currentSong = song;
    }

    LunaClient.info(this.musicController.textChannel!, new Embed({
      message: `Now playing **${this.musicController.currentSong?.video.title}**...`,
    }));

    const stream = ytdl(this.musicController.currentSong!.video.url);
    this.musicController.voiceConnection!.play(stream, {
      seek: this.musicController.currentSong!.offset,
      volume: this.musicController.volume,
    }).on('finish', () => this.play()).on('error', (_) => this.play())

    return true;
  }

  moveQueue() {
    this.musicController.history.push(this.musicController.currentSong!);
    this.musicController.currentSong = this.musicController.songQueue.shift();
  }

  checkVoiceChannel() {
    const voiceChannel: VoiceChannel = this.args['member'].voice.channel;
    
    // If the user is not present in any channel
    if (voiceChannel === null) {
      LunaClient.warn(this.args['textChannel'], new Embed({
        message: 'To use the music module, you must first join a voice channel'
      }));
      return false;
    }

    // If the bot has not joined any voice channel yet
    if (this.musicController.voiceChannel === undefined) {
      return true;
    }

    // If the user's voice channel is not the same as the bot's voice channel
    if (voiceChannel.id !== this.musicController.voiceChannel!.id) {
      LunaClient.warn(this.args['textChannel'], new Embed({
        message: 'You need to be in the same channel as the bot to use the music module'
      }));
      return false;
    }

    return true;
  }

  validateIndex(index: number | undefined, array: any[]): boolean {
    // If no message has been written
    if (index === undefined) {
      LunaClient.warn(this.musicController.textChannel!, new Embed({
        message: 'You did not write an index',
      }));
      return false;
    }

    // If the index is not a number
    if (isNaN(index)) {
      LunaClient.warn(this.musicController.textChannel!, new Embed({
        message: 'Not a valid index',
      }));
      return false;
    }

    // If the index is out of range
    if (index <= 0 || index > array.length) {
      LunaClient.warn(this.musicController.textChannel!, new Embed({
        message: 'Index is out of range',
      }));
      return false;
    }

    return true;
  }
}

class MusicController {
  readonly searcher: YTSearcher = new YTSearcher(process.env.YOUTUBE_SECRET!);

  textChannel: TextChannel | undefined;
  voiceChannel: VoiceChannel | undefined;
  voiceConnection: VoiceConnection | undefined;

  currentSong: Song | undefined;
  songQueue: Song[] = [];
  history: Song[] = [];

  volume: number = 1;

  isOccupied(): boolean {
    return this.currentSong !== undefined;
  }
}

class Song {
  video!: VideoEntry;
  /// Describes the song offset in seconds
  offset: number = 0;
  /// Only users present when this song was requested can manage it
  canBeManagedBy: string[];

  constructor({
    video,
    canBeManagedBy = []
  }: {
    video: VideoEntry,
    canBeManagedBy?: string[],
  }) {
    this.video = video;
    this.canBeManagedBy = canBeManagedBy;
  }
}