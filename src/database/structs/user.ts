import { Warning } from "./warning";

interface UserData {
  username: string;
  id: string;
  warnings: Warning[];
  mute?: Warning;
}

export class User {
  username: string;
  id: string;

  warnings: (Warning | null)[];
  mute?: Warning | null;

  constructor(data: UserData) {
    this.username = data.username;
    this.id = data.id;
    this.warnings = data.warnings;
    this.mute = data.mute;
  }

  serialize() {
    const serialized = {
      username: this.username,
      id: this.id,
      warnings: this.warnings.map((warning) => warning && warning.serialize()),
      mute: this.mute && this.mute.serialize(),
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
    });
  }
}