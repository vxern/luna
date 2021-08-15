
import moment, { Moment } from "moment";

import { Praise } from "./praise";
import { Warning } from "./warning";

import { EmojiCollection } from "../../modules/social/social";

interface UserData {
  username: string;
  id: string;

  warnings: Warning[];
  mute?: Warning;

  cannotPraiseUntil?: Moment;
  praises: Praise[];
  chosenEmojiSet?: string;
  isHiddenEmoji: boolean;
}

export class User {
  username: string;
  id: string;

  warnings: (Warning | null)[];
  mute?: Warning | null;

  cannotPraiseUntil?: Moment;
  praises: Praise[];
  chosenEmojiSet?: EmojiCollection;
  isHiddenEmoji: boolean;

  constructor(data: UserData) {
    this.username = data.username;
    this.id = data.id;
    this.warnings = data.warnings;
    this.mute = data.mute;
    this.cannotPraiseUntil = data.cannotPraiseUntil;
    this.praises = data.praises;
    this.chosenEmojiSet = data.chosenEmojiSet as EmojiCollection | undefined;
    this.isHiddenEmoji = data.isHiddenEmoji;
  }

  serialize() {
    const serialized = {
      username: this.username,
      id: this.id,
      warnings: this.warnings.map((warning) => warning && warning.serialize()),
      mute: this.mute && this.mute.serialize(),
      cannotPraiseUntil: this.cannotPraiseUntil?.unix(),
      praises: this.praises.map((praise) => praise.serialize()),
      chosenEmojiSet: this.chosenEmojiSet,
      isHiddenEmoji: this.isHiddenEmoji,
    };

    // Remove null entries after serialization
    this.warnings = this.warnings.filter((value) => value !== null);
    this.mute = this.mute ?? undefined;

    return serialized;
  }

  static deserialize(faunaObject: any) {
    return new User({
      username: faunaObject.username,
      id: faunaObject.id,
      warnings: faunaObject.warnings.map((warning: any) => Warning.deserialize(warning)),
      mute: faunaObject.mute && Warning.deserialize(faunaObject.mute),
      cannotPraiseUntil: faunaObject.cannotPraiseUntil && moment.unix(faunaObject.cannotPraiseUntil),
      praises: faunaObject.praises.map((praise: any) => Praise.deserialize(praise)),
      chosenEmojiSet: faunaObject.chosenEmojiSet,
      isHiddenEmoji: faunaObject.isHiddenEmoji || false,
    });
  }
}