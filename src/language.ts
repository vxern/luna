export class Language {
  static join(array: Array<String>, operator: 'and' | 'or' = 'and') {
    const lastElement = array.pop();
    let joined = array.join(', ');
    
    if (array.length > 0) {
      joined += ` ${operator} `;
    }

    joined += lastElement;

    return joined;
  }
}