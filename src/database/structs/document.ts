import { User } from "./user";

interface DocumentData {
  ref: string;
  user: User;
}

export class Document implements DocumentData {
  ref: string;
  user: User;

  constructor(data: DocumentData) {
    this.ref = data.ref;
    this.user = data.user;
  }

  static deserialize(faunaObject: any) {
    return new Document({
      ref: faunaObject.ref,
      user: User.deserialize(faunaObject.data),
    })
  }
}