import { TextChannel } from 'discord.js';
import { distance } from 'fastest-levenshtein';
import * as string from 'string-sanitizer';
import { YTSearchPage } from 'ytsearcher';

import { Client } from './client/client';

import { Service } from './services/service';

const digitsPattern = /\d+/g;
const wordsPattern = /[a-zA-Z]+/g;

export class Utils {
  /// Extracts numbers from a string
  static extractNumbers(target: string): number[] {
    return target.match(digitsPattern)?.map((digits) => Number(digits)) ?? [];
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
  static instantiated(classes: Array<any>, args: Array<any> = []): Array<any> {
    return classes.map((className) => new className(...args));
  }

  /// Capitalises each word in the target string
  static capitaliseWords(target: string): string {
    return target.split(' ').map((word) => word[0].toUpperCase() + word.substring(1)).join(' ');
  }

  /// Highlight all keywords of [phrase] in [target]
  static highlightKeywords(target: string, phrase: string): string {
    // Extract keywords which should be highlighted in [target] from [phrase] in lowercase format
    const keywordsToHighlight = phrase.toLowerCase().split(' ');
    // Maximum acceptable distance for another word be determined to be similar to this word
    const acceptableDistance = (word: string) => Math.max(Math.round(word.length / Math.E), 1);
    // Whether a word is similar to a keyword in [keywordsToHighlight]
    const similar = (word: string) => keywordsToHighlight.some((keyword) => distance(keyword, word.toLowerCase()) <= acceptableDistance(keyword));
    // Get the string keywords without unnecessary symbols
    const alphanumericOnlyKeywords = string.sanitize.keepUnicode(target).split(' ');
    // Find those words which when in lowercase format are similar to any of [keywordsToHighlight]
    const keywordsFound = [
      ...alphanumericOnlyKeywords.filter(similar), 
      ...this.coupleKeywordPairs(alphanumericOnlyKeywords, 'even').filter(similar), 
      ...this.coupleKeywordPairs(alphanumericOnlyKeywords, 'odd').filter(similar),
    ];
    // Highlight the necessary keywords in [target]
    keywordsFound.forEach((keyword) => {
      target = target.replace(RegExp(keyword, 'g'), '**' + keyword + '**')
    });
    return target;
  }

  /// Take an array, couple up elements in pairs, taking [set] as the basis for which elements constitute pairs
  static coupleKeywordPairs(array: string[], set: 'even' | 'odd'): string[] {
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
  static secondsToExtendedFormat(seconds: number): string {
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
    return target.split(' ').splice(1).join(' ').trim();
  }

  /// Replace any amount of consecutive spaces with a single space
  static normaliseSpaces(target: string) {
    return target.trim().replace(/ +/g, ' ')
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
      Client.warn(textChannel, `'${index}' is not a valid index`);
      return false;
    }

    // If the index is out of range
    if (index <= 0 || index > arrayLength - 1) {
      Client.warn(textChannel, 'Index is out of range');
      return false;
    }

    return true;
  }

  static getNamesOfDependencies(dependencies: any[]): string[] {
    return dependencies.map((name) => name.toString().split(' ')[1]);
  }

  static initialiseServices(services: Service[]) {
    services.forEach((service) => service.initialise());
  }
}