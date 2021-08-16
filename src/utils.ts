import { GuildMember, TextChannel } from 'discord.js';
import { distance as getDistance } from 'fastest-levenshtein';
import * as string from 'string-sanitizer';
import { YTSearchPage } from 'ytsearcher';

import { Client, GuildMessage } from './client/client';

import { Service } from './modules/service';

import roles from './roles.json';

const digitsPattern = /\d+/g;
const wordsPattern = /[a-zA-Z]+/g;

export type ModifySignature<T, R> = Omit<T, keyof R> & R;

export class Utils {
  /// Format string as code with 'fix' highlighting
  static toCode(target: string): string {
    return '```fix\n' + target + '```'
  }

  /// Extracts numbers from a string
  static extractNumbers(target: string): string[] {
    return target.match(digitsPattern) ?? [];
  }

  /// Extracts words from a string
  static extractWords(target: string): string[] {
    return target.match(wordsPattern) ?? [];
  }

  /// Checks if a value is a number by attempting to parse it and making sure it isn't `NaN`
  static isNumber(value: any): boolean { 
    return !isNaN(parseFloat(value)) && !isNaN(value - 0);
  }

  /// Takes names of classes and instantiates each of them, passing through [args]
  static instantiate(classes: Array<any>, args: Array<any> = []): Array<any> {
    return classes.map((className) => new className(...args));
  }

  /// Capitalises each word in the target string
  static capitaliseWords(target: string): string {
    return this.getWords(target).map((word) => word[0].toUpperCase() + word.substring(1)).join(' ');
  }

  /// Highlight all keywords of [phrase] in [target]
  static highlightKeywords(target: string, phrase: string): string {
    // Extract keywords which should be highlighted in [target] from [phrase] in lowercase format
    const keywordsToHighlight = this.getWords(phrase.toLowerCase());
    // Maximum acceptable distance for another word be determined to be similar to this word
    const acceptableDistance = (word: string) => Math.max(Math.round(word.length / Math.E), 1);
    // Whether a word is similar to a keyword in [keywordsToHighlight]
    const similar = (word: string) => keywordsToHighlight.some((keyword) => getDistance(keyword, word.toLowerCase()) <= acceptableDistance(keyword));
    // Get the string keywords without unnecessary symbols
    const alphanumericOnlyKeywords = this.getWords(string.sanitize.keepUnicode(target));
    // Find those words which when in lowercase format are similar to any of [keywordsToHighlight]
    const keywordsFound = [
      ...alphanumericOnlyKeywords.filter(similar), 
      ...this.coupleUpKeywordPairs(alphanumericOnlyKeywords, 'even').filter(similar), 
      ...this.coupleUpKeywordPairs(alphanumericOnlyKeywords, 'odd').filter(similar),
    ];
    // Highlight the necessary keywords in [target]
    keywordsFound.forEach((keyword) => {
      target = target.replace(RegExp(keyword, 'g'), '**' + keyword + '**')
    });
    return target;
  }

  /// Take an array, couple up elements in pairs, taking [set] as the basis for which elements constitute pairs
  static coupleUpKeywordPairs(array: string[], set: 'even' | 'odd'): string[] {
    const indexes = [...Array(array.length).keys()];
    const belongsToSet = set === 'even' ? (index: number) => index % 2 === 0 : (index: number) => index % 2 !== 0;
    const couplePair = (index: number) => array[index] + ' ' + array[index + 1];
    return indexes.filter(belongsToSet).map(couplePair);
  }

  /// Join elements of an array in an orthographically correct manner
  ///
  /// ['apple'] -> apple
  /// ['apple', 'banana'] -> apple and banana
  /// ['apple', 'banana', 'carrot'] -> apple, banana and/or carrot
  static join(array: string[], operator: 'and' | 'or') {
    const lastElement = array.pop();
    let joined = array.join(', ');

    if (array.length > 0) {
      joined += ` ${operator} `;
    }

    joined += lastElement;
    return joined;
  }

  /// Converts a number of seconds to extended time format (hh:mm:ss)
  ///
  /// 39 seconds -> 0:39
  /// 7 minutes 26 seconds -> 7:26
  /// 1 hour 5 minutes 48 seconds -> 1:05:48
  static convertSecondsToExtendedFormat(seconds: number): string {
    const hoursPart = Math.floor(seconds / 60 / 60);
    seconds -= hoursPart * 60 * 60;
    const minutesPart = Math.floor(seconds / 60);
    seconds -= minutesPart * 60;
    const secondsPart = seconds;

    return hoursPart.toString() + assemblePart(minutesPart) + assemblePart(secondsPart);

    function assemblePart(part: number): string {
      return (part < 10 ? ':0' : ':') + part.toString();
    }
  }

  /// Returns the target string after having removed the first word from it
  static removeFirstWord(target: string): string {
    return this.getWords(target).splice(1).join(' ').trim();
  }

  /// Replace any amount of consecutive spaces with a single space
  static normaliseSpaces(target: string) {
    return target.trim().replace(/ +/g, ' ')
  }

  /// Pluralise if a word needs to be pluralised
  static pluralise(target: string, number: number, pluralForm?: string) {
    return `${number !== 0 ? number : 'no'} ${number > 1 || number === 0 ? (pluralForm !== undefined ? pluralForm : target + 's') : target}`;
  }

  /// Decode encoded quotation marks included in YouTube video titles
  static decodeVideoTitles(targets: YTSearchPage): YTSearchPage {
    targets.forEach((value) => value.title = value.title.replace(/&#39;/g, '\'').replace(/&quot;/g, '"'));
    return targets;
  }

  /// Splits an array into chunks of size [chunkSize]
  static splitIntoChunks(array: any[], chunks: number): any[][] {
    const chunkSize = Math.ceil(array.length / chunks);
    let chunked = [];
    while (array.length !== 0) {
      chunked.push(array.splice(0, chunkSize));
    }
    return chunked;
  }

  /// Validates whether a given index is in bounds
  static isIndexInBounds(textChannel: TextChannel, index: number, arrayLength: number): boolean {
    // If the index is not a number
    if (isNaN(index)) {
      Client.warn(textChannel, `'${index}' is not a valid index.`);
      return false;
    }

    // If the index is out of range
    if (index <= 0 || index > arrayLength) {
      Client.warn(textChannel, 'Index is out of range.');
      return false;
    }

    return true;
  }

  /// Extract the name of an object or class that has not yet been instantiated
  static getNameOfClass(className: any): string {
    if (typeof className === 'object') return className.constructor.name;

    return this.getWords(className.toString())[1];
  }

  /// split(' ') will return [''] if the string is empty, which is not the desired behaviour
  static getWords(target: string): string[] {
    return target.length === 0 ? [] : target.split(' ');
  }

  /// Checks similarity of two strings using the Levenshtein distance algorithm
  static areSimilar(left: string, right: string): boolean {
    const sanitize = (target: string) => string.sanitize.keepUnicode(target);
    const compress = (target: string) => target.replace(/ +/g, '');

    left = compress(sanitize(left)).toLowerCase();
    right = compress(sanitize(right)).toLowerCase();

    const acceptableDistance = Math.floor(left.length / 3);
    const distance = getDistance(left, right);

    return distance <= acceptableDistance;
  }

  static removeDuplicateAndEmpty(words: string[]) {
    return words.filter((word, index, array) => word.length !== 0 && index === array.indexOf(word));
  } 

  static resolveNumber(textChannel: TextChannel, target: string | undefined): number | null | undefined {
    if (target !== undefined && !this.isNumber(target)) {
      Client.warn(textChannel, `'${target}' is not a number, but it was expected to be one.`);
      return null;
    }

    return target === undefined ? undefined : Number(target);
  }

  static isModerator(member: GuildMember) {
    return member.user.bot || member.roles.cache
      .map((role) => role.name)
      .includes(Utils.capitaliseWords(roles.moderator)) || false
  }

  /// Case-invariant 'includes' function
  static includes(left: string, right: string): boolean {
    return left.toLowerCase().includes(right.toLowerCase());
  }

  /// Generates a random number and determines whether `true`
  /// has been rolled based on the provided probability
  static roll(probability: number): boolean {
    return Math.random() <= probability;
  }

  /// Convert a user's ID to a Discord in-message tag
  static toUserTag(id: string): string {
    return `<@${id}>`;
  }

  /// Convert a role's ID to a Discord in-message tag
  static toRoleTag(id: string): string {
    return `<@&${id}>`;
  }
}