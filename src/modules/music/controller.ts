import { TextChannel, VoiceChannel, VoiceConnection } from "discord.js";
import { YTSearcher } from "ytsearcher";

import { Song } from "./song";

export class MusicController {
  readonly searcher: YTSearcher = new YTSearcher(process.env.YOUTUBE_SECRET!);

  textChannel: TextChannel | undefined;
  voiceChannel: VoiceChannel | undefined;
  voiceConnection: VoiceConnection | undefined;

  currentSong: Song | undefined;
  songQueue: Song[] = [];
  history: Song[] = [];

  volume: number = 1;

  isPlaying(): boolean {
    return this.currentSong !== undefined;
  }

  usersPresent(): string[] {
    return this.voiceChannel!.members.map((member) => member.id);
  }
}