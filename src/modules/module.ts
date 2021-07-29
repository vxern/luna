import { TextChannel } from "discord.js";

import { LunaClient } from "../client/client";
import { Embed } from "../client/embed";

const digits = /\d+/g;
const words = /[a-zA-Z]+/g;

export abstract class LunaModule {
  [functionName: string]: Function | Object;
  readonly requirement: Function | boolean = true;
  readonly beforeExecutingCommand: Function = () => {};
  abstract readonly commandTree: Object;
  args: any;

  async unimplemented(): Promise<boolean> {
    LunaClient.error(this.args['textChannel'], new Embed({
      message: 'This function is not yet implemented',
    }));
    return true;
  }
  
  /// Parses a time query to a base number of seconds described by the query
  resolveTimeQuery(query: string): number | undefined {
    let seconds = 0;

    // Extract the digits present in the query
    let integers = query.match(digits)?.map((integer) => parseInt(integer)) || [];
    // Extract the strings present in the query
    let strings = query.match(words) || [];

    // No parameters provided for either keys or values
    if (integers === null || strings === null) {
      LunaClient.warn(this.args['textChannel'], new Embed({
        message: 'You have not provided a valid time description as one of the required terms is missing',
      }));
      return;
    }

    // The number of keys does not match the number of values
    if (integers.length !== strings.length) {
      LunaClient.warn(this.args['textChannel'], new Embed({
        message: 'The number of time specifiers and values does not match',
      }));
      return;
    }

    if (integers.includes(0)) {
      LunaClient.warn(this.args['textChannel'], new Embed({
        message: 'A time value cannot be 0',
      }));
      return;
    }

    const secondIdentifiers = ['s', 'sec', 'second', 'seconds'];
    const minuteIdentifiers = ['m', 'min', 'minute', 'minutes'];
    const hourIdentifiers = ['h', 'hr', 'hour', 'hours'];

    for (let index = 0; index < integers.length; index++) {
      let multiplier = 1;

      if (minuteIdentifiers.includes(strings[index])) {
        multiplier = 60;
      }

      if (hourIdentifiers.includes(strings[index])) {
        multiplier = 60 * 60;
      }

      seconds += integers[index] * multiplier;

      LunaClient.warn(this.args['textChannel'], new Embed({
        message: `'${strings[index]} is not a valid time specifier'`,
      }));
      return;
    }

    return seconds;
  }
}