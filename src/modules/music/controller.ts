import { TextChannel, VoiceChannel, VoiceConnection } from "discord.js";
import { YTSearcher } from "ytsearcher";

import { Song } from "./song";

/// Class used for storing all required information for playing and managing music
export class MusicController {
  readonly searcher: YTSearcher = new YTSearcher(process.env.YOUTUBE_SECRET!);

  textChannel: TextChannel | undefined;
  voiceChannel: VoiceChannel | undefined;
  voiceConnection: VoiceConnection | undefined;

  currentSong: Song | undefined;
  songQueue: Song[] = [];
  history: Song[] = [];

  /// 0 = no sound, 1 = 100%, 1.5 = 150%
  volume: number = 1;

  /// Update [textChannel] and [voiceChannel] with variables taken from new user
  update(textChannel: TextChannel, voiceChannel: VoiceChannel) {
    this.textChannel = this.textChannel || textChannel;
    this.voiceChannel = this.voiceChannel || voiceChannel;
  }

  /// Determines whether the controller is occupied or not
  isPlaying(): boolean {
    return this.currentSong !== undefined;
  }

  /// Returns a list of IDs of users present in the voice channel at the time of execution
  usersPresent(): string[] {
    return this.voiceChannel!.members.map((member) => member.id);
  }
}