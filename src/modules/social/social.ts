import { GuildMember, PartialGuildMember } from 'discord.js';

import { GuildMessage } from '../../client/client';

import { Document } from "../../database/structs/document";

import { Praise } from './commands/praise';
import { Module } from '../module';

import { Utils } from '../../utils';

import config from '../../config.json';

export type EmojiCollection = 'flowers' | 'plants' | 'stars';

export class Social extends Module {
  readonly requirement = (message: GuildMessage) => Utils.isModerator(message.member!);
  readonly commandsRestricted = Utils.instantiate([], [this]);
  readonly commandUnrestricted = Utils.instantiate([Praise], [this]);

  private static readonly tierThresholds = [5, 10, 20, 40, 100];
  private static readonly emojiCollections = {
    flowers:  ['🌸', '💮', '🌷', '🌹', '💐'],
    medals:   ['🥉', '🥈', '🥇', '🎖️', '🏆'],
    plants:   ['🌱', '🌿', '🍀', '🍁', '🌾'],
    stars:    ['✨', '⭐', '🌟', '💫', '🌠'],
    vehicles: ['🛴', '🚲', '🛵', '🏍️', '🏎️'],
  };

  static assignEmoji(document: Document, member: GuildMember) {
    // The threshold array is reversed to simulate finding from the back, rather than from the front
    const tierIndex = this.tierThresholds
      .reverse()
      .findIndex((threshold) => document.user.praises.length >= threshold)!;
    const collection = (!!document.user.chosenEmojiSet ? 
      Social.emojiCollections[document.user.chosenEmojiSet] : 
      Social.emojiCollections['flowers']).reverse();

    const nicknameWithoutEmoji = member.displayName.includes('︱') ?
      member.displayName.split('︱').slice(1).join('︱') :
      member.displayName;

    const newNickname = (
      !document.user.isHiddenEmoji && tierIndex !== -1 ? 
      collection[tierIndex] + '︱' : 
      ''
    ) + nicknameWithoutEmoji;

    member.setNickname(newNickname);
  }

  static displayNumberOfPraises(document: Document): string {
    return `${Utils.toUserTag(document.user.id)} now has ${Utils.pluralise('praise', document.user.praises.length)}.\n\n`;
  }

  static displayEmojiInstructions(): string {
    return 'For instructions on how to choose a different emoji collection or how to hide the acknowledgement emoji, ' + 
      `use ${Utils.toCode(`${config.alias} usage profile`)}`;
  }
}