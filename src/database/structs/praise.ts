interface PraiseData {
  author: string;
  for?: string;
}

export class Praise implements PraiseData {
  author: string;
  for?: string;

  constructor(data: PraiseData) {
    this.author = data.author;
    this.for = data.for;
  }

  serialize() {
    return {
      author: this.author,
      comment: this.for || null,
    };
  }

  static deserialize(faunaObject: any) {
    return new Praise({
      author: faunaObject.author,
      for: faunaObject.comment,
    })
  }
}