import { Message, StreamOptions, TextChannel } from "discord.js";
import { YTSearcher, YTSearch, VideoEntry } from "ytsearcher";
import ytdl from 'ytdl-core';

import { Client } from "../../../client/client";

import { Music } from "../music";
import { Command } from "../../command";
import { Song, Listing } from "../songs";

import { Utils } from "../../../utils";

const spotifyPattern: RegExp = /https:\/\/open.spotify.com\//;
const youtubePattern: RegExp = /http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?‌​[\w\?‌​=]*)?/;

export class Play extends Command<Music> {
  readonly identifier = 'play';
  readonly aliases = ['request'];
  readonly description = 'Request to play a song by providing a URL to it, or searching using keywords';
  readonly arguments = ['songName | url'];
  readonly dependencies = [];
  readonly handler = this.request;

  readonly searcher: YTSearcher = new YTSearcher(process.env.YOUTUBE_SECRET!);

  async request(message: Message) {
    await this.module.bindToVoiceChannel(message.channel as TextChannel, message.member!.voice!.channel!);

    const listing = await this.resolveQueryToListing(message);

    if (listing === undefined) {
      return;
    }

    this.play(listing);
  }

  async resolveQueryToListing(message: Message): Promise<Listing | undefined> {
    if (spotifyPattern.test(message.content)) {
      // TODO: Handle Spotify link here
      return;
    }

    const youtubeUrl = await this.searchYoutube(message);

    if (youtubeUrl === undefined) {
      return;
    }

    const videoInfo = await ytdl.getInfo(youtubeUrl);

    return new Listing(Song.fromYoutubeDetails(videoInfo.videoDetails), this.module.usersPresent());
  }

  async searchYoutube(message: Message): Promise<string | undefined> {
    if (youtubePattern.test(message.content)) {
      return message.content;
    }

    /// YTSearcher.search() is marked as a synchronous function, but in actuality it returns a Promise.
    /// Awaiting the function without converting it to a promise yields a redundant usage tooltip.
    const searchYouTube = async (query: string) => await (
      (this.searcher.search(query) as unknown) as Promise<YTSearch>
    );

    const search = await searchYouTube(message.content);
    
    if (search.currentPage === undefined) {
      Client.warn(this.module.textChannel!, 'No videos found matching your search');
      return;
    }

    const searchResults = Array.from(Utils.decodeVideoTitles(search.currentPage));
    
    const video = await this.module.browse(
      message, searchResults, (videoEntry) => videoEntry.title
    );

    return video?.url;
  }

  /// Plays the requested song or the next song in queue
  async play(listing?: Listing, message: boolean = true) {
    if (listing !== undefined) {
      this.module.queue.push(listing!);

      // If the user requested a song while a song was already playing
      if (this.module.isPlaying()) {
        Client.info(this.module.textChannel!, `Added '${listing.title}' to the queue. [#${this.module.queue.length}]`);
        return;
      }
    }

    // Register the current song in the history of songs played, ensuring
    // that it is only added to history if the last song played wasn't the
    // same as the current song
    if (this.module.isPlaying()) {
      this.module.history.push(this.module.currentListing!);
    }

    // If there are no more songs to play, remove the current song
    // and stop the dispatcher
    if (this.module.queue.length === 0) {
      this.module.currentSong = undefined;
      this.module.currentListing = undefined;
      this.module.voiceConnection?.dispatcher?.end();
      return;
    }

    this.module.currentListing = this.module.queue.shift();
    this.module.currentSong = this.module.currentListing!.currentSong;

    const streamOptions: StreamOptions = {
      seek: this.module.currentSong!.offset,
      volume: this.module.volume,
    };
    const stream = ytdl(this.module.currentSong!.url);

    this.module.voiceConnection!.play(stream, streamOptions)
      .on('finish', () => this.play())
      .on('error', (_) => this.play());

    if (message) {
      Client.info(this.module.textChannel!, `Now playing '${this.module.currentSong!.title}'`);
    }
  }
}