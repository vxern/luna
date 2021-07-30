export class Utils {
  /// Checks if a value is a number by attempting to parse it and making sure it isn't `NaN`
  static isNumber(value: any): boolean { 
    return !isNaN(parseFloat(value)) && !isNaN(value - 0);
  }

  /// Takes names of classes and instantiates each of them, passing through [args]
  static instantiated<T>(classes: Array<any>, args: Array<any>): Array<T> {
    return classes.map((className) => new className(...args));
  }
}