import { distance } from 'fastest-levenshtein';

/// Class containing static utility language functions
export class Language {
  /// Capitalise each word in the target string
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
    const alphanumericOnlyKeywords = this.removeNonAlphanumeric(target).split(' ');
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

  /// Replace any amount of consecutive spaces with a single space
  static normaliseSpaces(target: string) {
    return target.trim().replace(/ +/g, ' ')
  }

  /// Remove characters that are neither alphabetic nor numeric
  static removeNonAlphanumeric(target: string) {
    return this.normaliseSpaces(target.replace(/[^0-9a-zA-Z_ ]/g, ''));
  }
}