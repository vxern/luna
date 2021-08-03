import { GuildMember, Role } from 'discord.js';

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