import { Message, VoiceChannel } from "discord.js";
import ytdl from 'ytdl-core';

import { LunaClient } from "../../client/client";
import { LunaModule } from "../module";
import { MusicController } from "./controller";

import { Embed } from "../../client/embed";
import { Language } from "../../language";
import { Song } from "./song";

import config from '../../config.json';

const youtubeUrlPattern: RegExp = /http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?‌​[\w\?‌​=]*)?/;

export class MusicModule extends LunaModule {
  public readonly requirement = () => this.verifyVoiceChannel();
  public readonly beforeExecutingCommand = () => this.controller.update(this.args['textChannel'], this.args['voiceChannel']);
  public readonly commandTree = {
    // Controlling the play of music
    'play ~ Play music either by providing a URL or searching using keywords': async (songName: string) => this.play(await this.search(songName)),
    'replay | play again | restart ~ Start playing the current song from the start': () => this.replay(),
    'pause | stop ~ Pause or unpause the current song': () => this.pause(),
    'resume | unpause | start ~ Resume the current song': () => this.resume(),
    
    // Controlling the movement of songs between queues
    'queue | song queue | songqueue ~ Display the list of queued songs': () => this.displayQueue(),
    'now | now playing | playing ~ Display the current playing song': () => this.displayNowPlaying(),
    'history | played ~ Display the history of songs played': () => this.displayHistory(),
    'skip | next ~ Play the next song in queue': () => this.skip(),
    'unskip ~ Return to the previous running song': () => this.unskip(),
    'remove ~ Remove a song from queue using its index': (indexOrName: string) => this.removeFromQueue(indexOrName),

    // Controlling the song flow
    //'forward|fastforward ~ Fast-forward the song by a given duration':
    //  (duration: string) => this.forward(this.resolveTimeQuery(duration)),
    //'rewind ~ Rewind the song by a given duration':
    //  (duration: string) => this.rewind(this.resolveTimeQuery(duration)),

    // Controlling the playback attributes
    //'volume ~ Display or set the current volume': {
    //  '': () => this.unimplemented(),
    //  '$volume': () => this.unimplemented(),
    //}
  };

  private readonly controller: MusicController = new MusicController();

  /// Searches for a song by URL or by name
  async search(songName: string): Promise<Song | undefined> {
    if (songName.length === 0) {
      LunaClient.warn(this.controller.textChannel!, new Embed({
        message: 'You did not provide a song name',
      }));
      return;
    }

    const youtubeUrl = youtubeUrlPattern.exec(songName)?.shift();

    if (youtubeUrl !== undefined) {
      const videoDetails = (await ytdl.getInfo(youtubeUrl)).videoDetails!;
      return new Song({
        title: videoDetails.title,
        url: videoDetails.video_url,
        canBeManagedBy: this.controller.usersPresent(),
      });
    }

    const searchResults = (await this.controller.searcher.search(songName)).currentPage?.slice(0, config.maximumSearchResults);

    if (searchResults === undefined) {
      LunaClient.warn(this.controller.textChannel!, new Embed({
        message: 'There are no videos found for your requested song',
      }));
      return;
    }
    
    // Decode encoded quotation marks included in YouTube video titles
    searchResults.forEach((value) => value.title = value.title.replace(/&#39;/g, '\'').replace(/&quot;/g, '"'));

    LunaClient.info(this.controller.textChannel!, Embed.singleField({
      name: 'Select a song below by writing its index',
      value: searchResults.map(
        (result, index) => index + 1 + ' ~ ' + Language.highlightKeywords(result.title, songName)
      ).join('\n\n'),
      inline: false,
    }));

    const message = await this.controller.textChannel?.awaitMessages(
      (message: Message) => message.author.id === this.args['member'].id,
      { max: 1, time: config.queryTimeout * 1000 },
    ).catch();

    let index = Number(message?.first()?.content);

    if (!this.isIndexInBounds(index, searchResults.length)) {
      return;
    }

    const video = searchResults[index - 1];

    return new Song({
      title: video.title,
      url: video.url,
      canBeManagedBy: this.controller.usersPresent(),
    });
  }

  /// Plays the requested song or the next song in queue
  async play(song?: Song) {
    this.controller.voiceConnection = await this.controller.voiceChannel?.join();

    // If the user requested a song while 
    if (song !== undefined) {
      this.controller.songQueue.push(song!);

      if (this.controller.isPlaying()) {
        LunaClient.info(this.controller.textChannel!, new Embed({
          message: `Added '${song.title}' to the queue. [#${this.controller.songQueue.length}]`,
        }));
        return;
      }
    }

    if (this.controller.currentSong !== undefined) {
      // Register the current song in the history of songs played
      this.controller.history.push(this.controller.currentSong!);
    }

    if (this.controller.songQueue.length === 0) {
      console.log('No more songs to play');
      return;
    }

    this.controller.currentSong = this.controller.songQueue.shift();

    const stream = ytdl(this.controller.currentSong!.url);
    this.controller.voiceConnection!.play(stream, {
      seek: this.controller.currentSong!.offset,
      volume: this.controller.volume,
    }).on('finish', () => this.play()).on('error', (_) => this.play())

    LunaClient.info(this.controller.textChannel!, new Embed({
      message: `Now playing ${this.controller.currentSong!.title}...`,
    }));
  }

  /// Restarts the current running song
  replay() {
    if (this.controller.currentSong === undefined) {
      LunaClient.warn(this.controller.textChannel!, new Embed({
        message: 'There is no song to replay',
      }));
      return;
    }

    // Add the current song to the beginning of the song queue and start playing
    this.controller.songQueue.unshift(this.controller.currentSong);
    this.play();

    LunaClient.info(this.controller.textChannel!, new Embed({
      message: `Replaying ${this.controller.currentSong!.title}...`,
    }));
  }

  /// Pauses or unpauses the song playing
  pause() {
    if (!this.controller.isPlaying()) {
      LunaClient.warn(this.controller.textChannel!, new Embed({
        message: 'There is no song to pause',
      }));
      return;
    }

    if (this.controller.voiceConnection!.dispatcher.paused) {
      // TODO: Fix this disgusting hack
      // https://github.com/discordjs/discord.js/issues/5300
      this.controller.voiceConnection!.dispatcher.resume();
      this.controller.voiceConnection!.dispatcher.pause();
      this.controller.voiceConnection!.dispatcher.resume();
      return;
    }

    this.controller.voiceConnection!.dispatcher.pause();
    
    LunaClient.info(this.controller.textChannel!, new Embed({
      message: 'Paused' + this.controller.currentSong!.title,
    }));
  }

  /// Resumes the song playing
  resume() {
    if (!this.controller.isPlaying()) {
      LunaClient.warn(this.controller.textChannel!, new Embed({
        message: 'There is no song to resume',
      }));
      return;
    }

    this.controller.voiceConnection!.dispatcher.resume();

    LunaClient.info(this.controller.textChannel!, new Embed({
      message: 'Resumed' + this.controller.currentSong!.title,
    }));
  }

  /// Displays the current song queue
  displayQueue() {
    LunaClient.info(this.controller.textChannel!, Embed.singleField({
      name: 'Up Next',
      value: this.controller.songQueue.length === 0 ? 
        'No songs in queue' :
        this.controller.songQueue.map(
          (song, index) => `${index + 1} ~ ${song.title}`
        ).join('\n\n'),
      inline: false,
    }));
  }

  /// Displays the current playing song
  displayNowPlaying() {
    LunaClient.info(this.controller.textChannel!, Embed.singleField({
      name: 'Now Playing',
      value: this.controller.currentSong === undefined ? 
        'No song is playing currently' : 
        this.controller.currentSong!.title,
      inline: false,
    }));
  }

  /// Displays the history of songs played
  displayHistory() {
    LunaClient.info(this.controller.textChannel!, Embed.singleField({
      name: 'History',
      value: this.controller.history.length === 0 ? 
        'No songs have been played before' :
        this.controller.history.reverse().map(
          (song, index) => `${index + 1} ~ ${song.title}`
        ).join('\n\n'),
      inline: false,
    }));
  }

  /// Plays the next song
  skip() {
    if (!this.controller.isPlaying()) {
      LunaClient.warn(this.controller.textChannel!, new Embed({
        message: 'There is no song to skip',
      }));
      return;
    }

    LunaClient.info(this.controller.textChannel!, new Embed({
      message: `Song ${this.controller.currentSong!.title} skipped`,
    }));

    this.play();
  }

  /// Plays the last song
  unskip() {
    if (this.controller.history.length === 0) {
      LunaClient.warn(this.controller.textChannel!, new Embed({
        message: 'There have been no songs played before',
      }));
      return;
    }

    if (this.controller.currentSong !== undefined) {
      this.controller.songQueue.unshift(this.controller.currentSong);
    }

    this.controller.songQueue.unshift(this.controller.history.pop()!);

    this.play();
  }

  /// Removes a song from queue, taking its index
  removeFromQueue(indexOrName: string) {
    if (this.controller.songQueue.length === 0) {
      LunaClient.warn(this.controller.textChannel!, new Embed({
        message: 'There are no songs in the song queue',
      }));
      return;
    }

    let index = Number(indexOrName);

    if (isNaN(index)) {
      indexOrName = indexOrName.toLowerCase();
      const songIndex = this.controller.songQueue.findIndex(
        (song) => song.title.toLowerCase().includes(indexOrName)
      );

      if (songIndex === undefined) {
        LunaClient.warn(this.controller.textChannel!, new Embed({
          message: 'There are no songs that match your query in the song queue',
        }));
        return;
      }

      index = songIndex;
    }

    if (!this.isIndexInBounds(index, this.controller.songQueue.length)) {
      return;
    }

    const removedSong = this.controller.songQueue.splice(index - 1, 1)[0];

    LunaClient.info(this.controller.textChannel!, new Embed({
      message: `Song #${index} ~ ${removedSong.title} removed from the queue`,
    }));
  }

  /// Validates that the user can use the music module as a whole by checking if they're in the same voice channel
  verifyVoiceChannel(): boolean {
    const voiceChannel: VoiceChannel = this.args['member'].voice.channel;
    
    // If the user is not present in any channel
    if (voiceChannel === null) {
      LunaClient.warn(this.args['textChannel'], new Embed({
        message: 'To use the music module, you must first join a voice channel'
      }));
      return false;
    }

    // If the bot has not joined any voice channel yet
    if (this.voiceChannel === undefined) {
      return true;
    }

    // If the user's voice channel is not the same as the bot's voice channel
    if (voiceChannel.id !== this.controller.voiceChannel!.id) {
      LunaClient.warn(this.args['textChannel'], new Embed({
        message: 'You need to be in the same channel as the bot to use the music module'
      }));
      return false;
    }

    return true;
  }

  /// Validates whether a given index is in bounds
  isIndexInBounds(index: number | undefined, arrayLength: number): boolean {
    // If no message has been written
    if (index === undefined) {
      LunaClient.warn(this.controller.textChannel!, new Embed({
        message: 'You did not write an index',
      }));
      return false;
    }

    // If the index is not a number
    if (isNaN(index)) {
      LunaClient.warn(this.controller.textChannel!, new Embed({
        message: `'${index}' is not a valid index`,
      }));
      return false;
    }

    // If the index is out of range
    if (index <= 0 || index > arrayLength - 1) {
      LunaClient.warn(this.controller.textChannel!, new Embed({
        message: 'Index is out of range',
      }));
      return false;
    }

    return true;
  }
}