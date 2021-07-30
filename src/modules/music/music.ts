import { Message, StreamOptions, VoiceChannel } from "discord.js";
import ytdl from 'ytdl-core';
import { YTSearch } from "ytsearcher";

import { LunaClient } from "../../client/client";
import { Embed } from "../../client/embed";
import { LunaModule } from "../module";
import { MusicController } from "./controller";
import { Language } from "../../language";
import { Song } from "./song";

import { Utils } from "../../utils";

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
    'forward | fastforward ~ Fast-forward the song by a given duration': (duration: string) => this.forward(this.resolveTimeQuery(duration)),
    'rewind ~ Rewind the song by a given duration': (duration: string) => this.rewind(this.resolveTimeQuery(duration)),

    // Controlling the playback attributes
    //'volume ~ Display or set the current volume': {
    //  '': () => this.unimplemented(),
    //  '$volume': () => this.unimplemented(),
    //}
  };

  private readonly controller: MusicController = new MusicController();

  /// YTSearcher.search() is marked as a synchronous function, but in actuality it returns a Promise.
  /// Awaiting the function without converting it to a promise yields a redundant usage tooltip.
  private searchYouTube = async (songName: string) => await (
    (this.controller.searcher.search(songName) as unknown) as Promise<YTSearch>
  );

  /// Searches for a song by URL or by name
  async search(query: string): Promise<Song | undefined> {
    if (query.length === 0) {
      LunaClient.warn(this.controller.textChannel!, new Embed({
        message: 'You did not provide a song name',
      }));
      return;
    }

    const youtubeUrl = youtubeUrlPattern.exec(query)?.shift() || await this.getVideoUrlByName(query);

    const videoInfo = await ytdl.getInfo(youtubeUrl!);
    const videoDetails = videoInfo.videoDetails;

    return Song.fromDetails(videoDetails, this.controller.usersPresent(this.args['bot'].id));
  }

  async getVideoUrlByName(songName: string): Promise<string | undefined> {
    const userId = this.args['member'].id; 

    const search = await this.searchYouTube(songName);
    const searchResults = search.currentPage?.slice(0, config.maximumSearchResults);

    if (searchResults === undefined) {
      LunaClient.warn(this.controller.textChannel!, new Embed({
        message: 'There are no videos found for your requested song',
      }));
      return;
    }
    
    // Decode encoded quotation marks included in YouTube video titles
    searchResults.forEach((value) => value.title = value.title.replace(/&#39;/g, '\'').replace(/&quot;/g, '"'));

    // Display the list of choices to the user
    const message = await LunaClient.info(this.controller.textChannel!, Embed.singleField({
      name: 'Select a song below by writing its index',
      value: searchResults.map(
        (result, index) => index + 1 + ' ~ ' + Language.highlightKeywords(result.title, songName)
      ).join('\n\n'),
      inline: false,
    }));
    
    await message.react('❌');

    const collector = message.createReactionCollector(
      (reaction, user) => reaction.emoji.name === '❌' && user.id === userId,
      { max: 1, time: config.queryTimeout * 1000 },
    );

    const responses = this.controller.textChannel!.createMessageCollector(
      (message: Message) => message.author.id === userId && Utils.isNumber(message.content),
      { max: 1, time: config.queryTimeout * 1000 },
    );

    const url = new Promise<string | undefined>((resolve) => {
      responses.on('collect', (response: Message) => {
        const index = Number(response.content);
  
        if (!this.isIndexInBounds(index, searchResults.length)) {
          resolve(undefined);
          return;
        }
  
        resolve(searchResults[index - 1].url);
      });
  
      responses.on('end', (collected) => {
        if (collected.size !== 0) {
          resolve(undefined);
          return;
        } 
  
        LunaClient.warn(this.controller.textChannel!, new Embed({
          message: 'You did not write an index',
        }));
        
        resolve(undefined);
      });
  
      collector.on('end', () => {
        responses.removeAllListeners();
        resolve(undefined);
      });
    });

    return await url;
  }

  /// Plays the requested song or the next song in queue
  async play(song?: Song, message: boolean = true) {
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

    // Register the current song in the history of songs played, ensuring
    // that it is only added to history if the last song played wasn't the
    // same as the current song
    if (this.controller.isPlaying()) {
      this.controller.history.push(this.controller.currentSong!);
    }

    // If there are no more songs to play, remove the current song
    // and stop the dispatcher
    if (this.controller.songQueue.length === 0) {
      this.controller.currentSong = undefined;
      this.controller.voiceConnection?.dispatcher?.end();
      return;
    }

    this.controller.currentSong = this.controller.songQueue.shift();

    const streamOptions: StreamOptions = {
      seek: this.controller.currentSong!.offset,
      volume: this.controller.volume,
    }
    const stream = ytdl(this.controller.currentSong!.url);

    this.controller.voiceConnection!.play(stream, streamOptions)
      .on('finish', () => this.play())
      .on('error', (_) => this.play())

    if (message) {
      LunaClient.info(this.controller.textChannel!, new Embed({
        message: `Now playing '${this.controller.currentSong!.title}'`,
      }));
    }
  }

  /// Restarts the current running song
  replay(message: boolean = true) {
    if (this.controller.currentSong === undefined) {
      LunaClient.warn(this.controller.textChannel!, new Embed({
        message: 'There is no song to replay',
      }));
      return;
    }

    if (!this.userCanManageSong(this.controller.currentSong)) {
      return;
    }

    // Add the current song to the beginning of the song queue and start playing
    this.controller.songQueue.unshift(this.controller.currentSong);

    if (message) {
      LunaClient.info(this.controller.textChannel!, new Embed({
        message: `Replaying ${this.controller.currentSong!.title}...`,
      }));
    }

    this.controller.currentSong = undefined;
    this.play(undefined, false);
  }

  /// Pauses or unpauses the song playing
  pause() {
    if (!this.controller.isPlaying()) {
      LunaClient.warn(this.controller.textChannel!, new Embed({
        message: 'There is no song to pause',
      }));
      return;
    }

    if (!this.userCanManageSong(this.controller.currentSong!)) {
      return;
    }

    if (this.controller.voiceConnection!.dispatcher.paused) {
      this.resume();
      return;
    }

    this.controller.voiceConnection!.dispatcher.pause();
    
    LunaClient.info(this.controller.textChannel!, new Embed({
      message: `Paused '${this.controller.currentSong!.title}'`,
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

    if (!this.userCanManageSong(this.controller.currentSong!)) {
      return;
    }

    // TODO: Fix this disgusting hack
    // https://github.com/discordjs/discord.js/issues/5300
    this.controller.voiceConnection!.dispatcher.resume();
    this.controller.voiceConnection!.dispatcher.pause();
    this.controller.voiceConnection!.dispatcher.resume();

    LunaClient.info(this.controller.textChannel!, new Embed({
      message: `Resumed '${this.controller.currentSong!.title}'`,
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
    let songString = 'No song is playing currently';
    
    if (this.controller.currentSong !== undefined) {
      songString = `${this.controller.currentSong.title} (${this.controller.runningTimeAsString(this.controller.currentSong!)})`;
    }

    if (this.controller.voiceConnection?.dispatcher?.paused) {
      songString = ':pause_button: ' + songString;
    }

    LunaClient.info(this.controller.textChannel!, Embed.singleField({
      name: 'Now Playing',
      value: songString,
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

    if (!this.userCanManageSong(this.controller.currentSong!)) {
      return;
    }

    LunaClient.info(this.controller.textChannel!, new Embed({
      message: `Skipped '${this.controller.currentSong!.title}'`,
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
      if (!this.userCanManageSong(this.controller.currentSong)) {
        return;
      }

      this.controller.songQueue.unshift(this.controller.currentSong);
    }

    const songToUnskip = this.controller.history.pop()!;
    songToUnskip.canBeManagedBy = this.controller.usersPresent(this.args['bot'].id);
    this.controller.songQueue.unshift(songToUnskip);

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

    index -= 1;
    
    if (!this.userCanManageSong(this.controller.songQueue[index])) {
      return;
    }

    const removedSong = this.controller.songQueue.splice(index, 1)[0];

    LunaClient.info(this.controller.textChannel!, new Embed({
      message: `Song #${index} ~ ${removedSong.title} removed from the queue`,
    }));
  }

  /// Fast-forwards the song by a given number of seconds
  forward(seconds: number | undefined) {
    if (seconds === undefined) {
      return;
    }

    if (!this.controller.isPlaying()) {
      LunaClient.warn(this.controller.textChannel!, new Embed({
        message: 'There is no song to fast-forward',
      }));
      return;
    }

    if (!this.userCanManageSong(this.controller.currentSong!)) {
      return;
    }

    // How long the song has been running for since the last time it has been played
    const currentOffset = this.controller.currentSong!.offset;
    const streamTime = this.controller.streamTimeInSeconds();
    const totalOffset = currentOffset + streamTime + seconds;

    if (totalOffset >= this.controller.currentSong!.duration - 5) {
      LunaClient.warn(this.controller.textChannel!, new Embed({
        message: 'Cannot fast-forward beyond the song duration',
      }));
      return;
    }

    this.controller.currentSong!.offset = totalOffset;

    LunaClient.info(this.controller.textChannel!, new Embed({
      message: `Fast-forwarded the song by ${Language.secondsToExtendedFormat(seconds)} ~ ` + 
               `${this.controller.runningTimeAsString(this.controller.currentSong!)}`,
    }));

    this.replay(false);
  }

  /// Rewinds the song by a given number of seconds
  rewind(seconds: number | undefined) {
    if (seconds === undefined) {
      return;
    }

    if (!this.controller.isPlaying()) {
      LunaClient.warn(this.controller.textChannel!, new Embed({
        message: 'There is no song to rewind',
      }));
      return;
    }

    if (!this.userCanManageSong(this.controller.currentSong!)) {
      return;
    }

    // How long the song has been running for since the last time it has been played
    const currentOffset = this.controller.currentSong!.offset;
    const streamTime = this.controller.streamTimeInSeconds();
    const totalOffset = currentOffset + streamTime - seconds;

    let rewindMessage;

    if (totalOffset <= 5) {
      this.controller.currentSong!.offset = 0;
      rewindMessage = 'to start';
    } else {
      this.controller.currentSong!.offset = totalOffset;
      rewindMessage = `by ${Language.secondsToExtendedFormat(seconds)}`;
    }

    LunaClient.info(this.controller.textChannel!, new Embed({
      message: `Rewound the song ${rewindMessage} ~ ` + 
               `${this.controller.runningTimeAsString(this.controller.currentSong!)}`,
    }));

    this.replay(false);
  }

  /// Validates that the user can use the music module as a whole
  /// by checking if they're in the same voice channel
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

  /// Determines whether the user can manage a song based on whether
  /// they have been present in the voice channel when the song was requested
  userCanManageSong(song: Song): boolean {
    if (!song.canBeManagedBy.includes(this.args['member'].id) && 
        /// If all the users who could manage the song are no longer present, the
        /// song will automatically be unlocked.
        this.controller.usersPresent(this.args['bot'].id).some((userId) => song.canBeManagedBy.includes(userId))) {
      LunaClient.warn(this.args['textChannel'], new Embed({
        message: `You cannot manage a song which has been requested in your absence`
      }));
      return false;
    }

    return true;
  }

  /// Validates whether a given index is in bounds
  isIndexInBounds(index: number, arrayLength: number): boolean {
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