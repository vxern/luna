import { distance } from 'fastest-levenshtein';
import { Utils } from './utils';

export class Language {
  static capitaliseWords(target: string) {
    return target.split(' ').map((word) => word[0].toUpperCase() + word.substring(1)).join(' ');
  }

  static highlightKeywords(target: string, phrase: string) {
    // Extract keywords which should be highlighted in [target] from [phrase] in lowercase format
    const keywordsToHighlight = phrase.toLowerCase().split(' ');
    // Lambda function calculating the maximum acceptable distance for two words be determined to be similar
    const acceptableDistance = (word: string) => Math.max(Math.round(word.length / Math.E), 1);
    // Lambda function determining whether a word is similar to a keyword in [keywordsToHighlight]
    const similar = (word: string) => keywordsToHighlight.some((keyword) => distance(keyword, word.toLowerCase()) <= acceptableDistance(keyword));
    // Get the string keywords without unnecessary symbols
    const alphanumericOnlyKeywords = this.removeNonAlphanumeric(target).split(' ');
    // Find those words which when in lowercase format are similar to any of [keywordsToHighlight]
    const keywordsFound = [
      ...alphanumericOnlyKeywords.filter(similar), 
      ...Utils.getKeywordPairs(alphanumericOnlyKeywords, 'even').filter(similar), 
      ...Utils.getKeywordPairs(alphanumericOnlyKeywords, 'odd').filter(similar),
    ];
    // Highlight the necessary keywords in [target]
    keywordsFound.forEach((keyword) => {target = target.replace(RegExp(keyword, 'g'), '**' + keyword + '**')});
    return target;
  }

  static join(array: string[], operator: 'and' | 'or' = 'and') {
    const lastElement = array.pop();
    let joined = array.join(', ');
    
    if (array.length > 0) {
      joined += ` ${operator} `;
    }

    joined += lastElement;

    return joined;
  }

  static normaliseSpaces(target: string) {
    return target.trim().replace(/ +/g, ' ')
  }

  static removeNonAlphanumeric(target: string) {
    return this.normaliseSpaces(target.replace(/[^0-9a-zA-Z_ ]/g, ''));
  }
}