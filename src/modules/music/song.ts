import { MoreVideoDetails } from "ytdl-core";

import { Language } from "../../language";

export class Song {
  /// Song title
  title: string;
  /// Song URL
  url: string;
  /// Song offset in seconds
  offset: number = 0;
  /// Song span/length in seconds
  duration: number = 0;
  /// Only users present when this song was requested can manage it
  canBeManagedBy: string[];

  constructor({title, url, length, canBeManagedBy = []}: {title: string, url: string, length: number, canBeManagedBy?: string[]}) {
    this.title = title;
    this.url = url;
    this.duration = length;
    this.canBeManagedBy = canBeManagedBy;
  }

  runningTimeAsString(): string {
    return Language.secondsToExtendedFormat(this.offset) + ' / ' + Language.secondsToExtendedFormat(this.duration);
  }

  static fromDetails(videoDetails: MoreVideoDetails, usersPresent: string[]) {
    return new Song({
      title: videoDetails.title,
      url: videoDetails.video_url,
      length: Number(videoDetails.lengthSeconds),
      canBeManagedBy: usersPresent,
    })
  }
}