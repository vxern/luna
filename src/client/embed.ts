import { EmbedField } from 'discord.js';

import config from '../config.json';

export class Embed {
  title?: string;
  thumbnail?: string;
  message?: string;
  private _color!: number;
  public get color() {
    return this._color;
  }
  public set color(value: string | number) {
    this._color = Number(value);
  }
  fields?: EmbedField[];

  constructor({
    title = undefined,
    thumbnail = undefined,
    message = undefined,
    color = config.accentColorNormal,
    fields = undefined
  }: {
    title?: string,
    thumbnail?: string,
    message?: string,
    color?: string,
    fields?: EmbedField[],
  }) {
    this.title = title;
    this.thumbnail = thumbnail;
    this.message = message;
    this.color = color;
    this.fields = fields;
  }

  static singleField(field: EmbedField) {
    return new Embed({fields: [field]});
  }
}