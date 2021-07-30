export class Utils {
  static isNumber(number: any): boolean { 
    return !isNaN(parseFloat(number)) && !isNaN(number - 0) 
  }
}