import { EmbedField } from 'discord.js';

import config from '../config.json';

export class Embed {
  title?: string;
  thumbnail?: string;
  message?: string;
  private _color!: number;

  public get color(): string {
    return this._color.toString();
  }
  
  public set color(value: string) {
    this._color = Number(value);
  }

  fields?: Array<EmbedField>;

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
    fields?: Array<EmbedField>,
  }) {
    this.title = title;
    this.thumbnail = thumbnail;
    this.message = message;
    this.color = color;
    this.fields = fields;
  }
}