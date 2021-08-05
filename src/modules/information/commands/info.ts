import { Guild } from "discord.js";
import { default as moment } from 'moment';

import { Client } from "../../../client/client";
import { Embed } from "../../../client/embed";

import { Information } from "../information";
import { Roles } from "../../roles/roles";
import { Command, HandlingData } from "../../command";

import { Utils } from "../../../utils";

import roles from '../../../roles.json';

export class Info extends Command<Information> {
  readonly identifier = 'info';
  readonly aliases = ['information'];
  readonly description = 'Displays helpful information about the server';
  readonly parameters = [];
  readonly dependencies = [];
  readonly handler = this.info;

  /// Displays an informational menu
  async info({message}: HandlingData) {
    const guild = message.guild!;

    const percentages = await this.getPercentagesOfProficiencies(guild);

    const createdAt = moment(guild.createdAt);

    Client.send(message.channel, new Embed({
      title: guild.name,
      thumbnail: guild.iconURL()!,
      fields: [{
        name: 'Information',
        value: guild.description!,
        inline: true,
      }, {
        name: 'Members',
        value: `**${guild.memberCount}**\n\n` + percentages.join('\n'),
        inline: true,
      },  {
        name: 'Created',
        value: `${createdAt.format('Do of MMMM YYYY')} (${createdAt.fromNow()})`,
        inline: false,
      }]
    }));
  }

  async getPercentagesOfProficiencies(guild: Guild): Promise<string[]> {
    const members = await guild.members.fetch();
    // Capitalise each of the proficiency roles to match the actual names on the server
    const proficiencies = roles.proficiency.map((proficiency) => Utils.capitaliseWords(proficiency));
    // Obtain the tags for each of the proficiency roles
    const proficiencyTags = proficiencies.map(
      (proficiency) => Roles.toTag(guild?.roles.cache.find((role) => role.name === proficiency)!.id!)
    );
    // Calculate the fractions that each proficiency takes up on the server
    const fractions = proficiencies.map((proficiency) => members.filter(
        (member) => member.roles.cache
          .map((role) => role.name)
          .includes(proficiency)
        ).size / guild.memberCount
    );
    // Construct percentages to display, together with the proficiency each percentage stands for
    return fractions.map(
      (fraction, index) => `**${(fraction * 100).toPrecision(3)}**% ${proficiencyTags[index]}`
    ).reverse();
  }
}