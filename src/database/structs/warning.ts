import moment, { Moment } from "moment";

interface WarningData {
  reason: string;
  expiresAt: Moment;
}

export class Warning implements WarningData {
  reason: string;

  expiresAt: Moment;

  constructor(data: WarningData) {
    this.reason = data.reason;
    this.expiresAt = data.expiresAt;
  }

  serialize() {
    return {
      reason: this.reason,
      expiresAt: this.expiresAt.unix(),
    };
  }

  static deserialize(faunaObject: any) {
    return new Warning({
      reason: faunaObject.reason,
      expiresAt: moment.unix(faunaObject.expiresAt),
    })
  }
}