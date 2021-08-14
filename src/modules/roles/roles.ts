import { GuildMember, Role, TextChannel } from 'discord.js';

import { Client } from '../../client/client';

import { Module } from '../module';

import { Assignable } from './commands/assignable';
import { AssignRole } from './commands/assign-role';

import { Utils } from '../../utils';

import roles from '../../roles.json';

export class Roles extends Module {
  readonly commandUnrestricted = Utils.instantiate([Assignable, AssignRole], [this]);

  // Concatenate the roles specified in [roles.json] into a single array
  readonly allRoles = [
    ...roles.proficiency,
    ...roles.regions,
    ...roles.ethnicities,
    ...roles.abroad,
    ...roles.miscellaneous,
  ];

  static addRole(textChannel: TextChannel | undefined, member: GuildMember, roleName: string) {
    member.roles.add(Roles.findRole(member, roleName));

    if (textChannel === undefined) return;

    const capitalisedRoleName = Utils.capitaliseWords(roleName);

    let message = `You now have the role '${capitalisedRoleName}'`;

    if (roles.ethnicities.includes(roleName)) {
      if (Roles.hasEnoughEthnicityRoles(member)) {
        Client.warn(textChannel, 
          `You may not be of more than ${roles.maximumEthnicityRoles} Romanian ethnicities at any given time.`);
        return;
      }

      message = `You are now ${capitalisedRoleName}`;
    }

    if (roles.regions.includes(roleName)) {
      if (Roles.hasEnoughRegionRoles(member)) {
        Client.warn(textChannel, 
          `You may not have more than ${roles.maximumRegionRoles} region roles at any given time.`);
        return;
      }

      message = `You are now from ${capitalisedRoleName}`;
    }

    if (roles.abroad.includes(roleName)) {
      message = `You are now a ${roleName}`;
    }

    Client.info(textChannel, message + `.  :partying_face:`);
  }

  static removeRole(textChannel: TextChannel | undefined, member: GuildMember, roleName: string) {
    member.roles.remove(Roles.findRole(member, roleName));

    if (textChannel === undefined) return;

    const capitalisedRoleName = Utils.capitaliseWords(roleName);

    let message = `You no longer have the role '${capitalisedRoleName}'`;

    if (roles.regions.includes(roleName)) {
      message = `You are no longer from ${capitalisedRoleName}`;
    }

    if (roles.ethnicities.includes(roleName)) {
      message = `You are no longer ${capitalisedRoleName}`;
    }

    if (roles.abroad.includes(roleName)) {
      message = `You are no longer a ${capitalisedRoleName}`;
    }

    Client.info(textChannel, message + `.  :sob:`);
  }

  /// Check if the user already has the maximum number of ethnicity roles
  static hasEnoughEthnicityRoles(member: GuildMember): boolean {
    return member.roles.cache.filter(
      (role) => roles.ethnicities.includes(role.name.toLowerCase())
    ).size >= roles.maximumEthnicityRoles;
  }

  /// Check if the user already has the maximum number of region roles
  static hasEnoughRegionRoles(member: GuildMember): boolean {
    return member.roles.cache.filter(
      (role) => roles.regions.includes(role.name.toLowerCase())
    ).size >= roles.maximumRegionRoles;
  }

  /// Resolve the name of a role to a `Role` object
  static findRole(member: GuildMember, roleName: string): Role {
    return member.guild.roles.cache.find((role) => role.name.toLowerCase() === roleName)!;
  }

  /// Check if the user has a proficiency role by passing its name
  static hasProficiency(member: GuildMember): boolean {
    return member.roles.cache.some((role) => roles.proficiency.includes(role.name.toLowerCase()))
  }

  /// Convert a role's ID to a Discord in-message tag
  static toTag(id: string): string {
    return `<@&${id}>`;
  }
}