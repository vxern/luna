export class Utils {
  static getKeywordPairs(array: string[], set: 'even' | 'odd'): string[] {
    const indexes = [...Array(array.length).keys()];
    const inSet = set === 'even' ? (index: number) => index % 2 === 0 : (index: number) => index % 2 !== 0;
    return indexes.filter(inSet).map((index) => array[index] + ' ' + array[index + 1])
  }
}