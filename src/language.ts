export class Language {
  static capitaliseWords(target: string) {
    return target.split(' ').map((word) => word[0].toUpperCase() + word.substring(1)).join(' ');
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

  static removeNonAlphanumeric(target: string) {
    return target.replace(/\W/g, '');
  }
}