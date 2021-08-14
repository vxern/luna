import { GuildMember, Role, TextChannel } from "discord.js";

import { Client, GuildMessage } from "../../../client/client";

import { Roles } from "../roles";
import { Command, HandlingData } from "../../command";

import { Utils } from "../../../utils";

import config from '../../../config.json';
import roles from '../../../roles.json';

export class AssignRole extends Command<Roles> {
  readonly identifier = '$rolename';
  readonly aliases = [];
  readonly description = 'Assigns or unassigns a role from a user.';
  readonly parameters = [];
  readonly dependencies = [];
  readonly handler = this.resolve;

  /// Resolve message to a single or multiple `resolveRole` calls
  async resolve({message, parameter}: HandlingData) {
    parameter = parameter!.toLowerCase();

    // If the parameter is not a list of rules, but rather a single role
    if (!parameter.includes(',')) {
      return this.resolveRole({message: message, parameter: parameter});
    }

    const roleNames = Utils.removeDuplicateAndEmpty(
      parameter.split(',').map((roleName) => roleName.trim())
    );

    if (roleNames.length === 0) return;

    if (roleNames.length > config.maximumRolesAtOnce) {
      Client.warn(message.channel, `You may not request more than ${config.maximumRolesAtOnce} roles at once.`);
      return;
    }

    const rolesRequestedFromCategory = (category: string[]) => roleNames.filter(
      (roleName) => category.includes(roleName)
    ).length;

    if (rolesRequestedFromCategory(roles.proficiency) > 1) {
      Client.warn(message.channel, 
        'You may not request more than one proficiency role in a single list expression.'
      );
      return;
    }

    const ethnicitiesRequested = rolesRequestedFromCategory(roles.ethnicities);
    if (ethnicitiesRequested > roles.maximumEthnicityRoles) {
      Client.warn(message.channel, 
        `You may not request more than ${Utils.pluralise('ethnicity', roles.maximumEthnicityRoles, 'ethnicities')} in a single list expression.`
      );
      return;
    }

    const regionsRequested = rolesRequestedFromCategory(roles.regions);
    if (regionsRequested > roles.maximumRegionRoles) {
      Client.warn(message.channel as TextChannel, 
        `You may not request more than ${Utils.pluralise('region', roles.maximumRegionRoles)} in a single list expression.`
      );
      return;
    }

    for (const roleName of roleNames) {
      await new Promise((resolve) => setTimeout(resolve, config.roleAssignmentDelay * 1000));
      this.resolveRole({message: message, parameter: roleName});
    }
  }

  /// Resolve message to a `Role`; verify that the user can assign it; add it to the user, otherwise, remove it
  async resolveRole({message, parameter}: {message: GuildMessage, parameter: string}) {
    const roleName = parameter.toLowerCase();

    // If the sought role is not found in [allRoles]
    if (!this.module.allRoles.includes(roleName)) return;

    // If the sought role is not a proficiency role
    if (!roles.proficiency.includes(roleName)) {
      return this.resolveNonProficiencyRole(message.channel, message.member!, roleName);
    }

    if (!this.hasRole(message.member!, roleName)) {
      const currentProficiencyRole = this.getCurrentProficiencyRole(message.member!);
      return this.addOrReplaceProficiencyRole(message.channel, message.member!, roleName, currentProficiencyRole);
    }

    let baseMessage = `Your level is already ${
      Roles.toTag(Roles.findRole(message.member!, roleName).id)
    }.\n\nInstead, you may `;
    let upgradeMessage = ':arrow_double_up: upgrade to ';
    let downgradeMessage = ':arrow_double_down: downgrade to ';

    const indexOfProficiencyRole = roles.proficiency.indexOf(roleName);

    const roleTagsToUpgradeTo: string[] = this.getTagsOfProficiencyRolesBetterThan(message.member!, indexOfProficiencyRole);
    const roleTagsToDowngradeTo: string[] = this.getTagsOfProficiencyRolesWorseThan(message.member!, indexOfProficiencyRole);

    if (roleTagsToUpgradeTo.length !== 0) {
      upgradeMessage += Utils.join(roleTagsToUpgradeTo, 'or');
      baseMessage += upgradeMessage;

      if (roleTagsToDowngradeTo.length !== 0) {
        baseMessage += ' or ';
      }
    }

    if (roleTagsToDowngradeTo.length !== 0) {
      downgradeMessage += Utils.join(roleTagsToDowngradeTo, 'or');
      baseMessage += downgradeMessage;
    }

    Client.info(message.channel, baseMessage);
  }

  /// Assign or unassign a non-proficiency role
  resolveNonProficiencyRole(textChannel: TextChannel, member: GuildMember, roleName: string) {
    // If the user does not have a proficiency role yet
    if (!Roles.hasProficiency(member)) return;

    // If the user already has the sought role
    if (this.hasRole(member, roleName)) {
      return Roles.removeRole(textChannel, member, roleName);
    }

    return Roles.addRole(textChannel, member, roleName);
  }

  /// Assign the user a proficiency role, or if the user already has one,
  /// replace it with the newly requested proficiency role
  addOrReplaceProficiencyRole(
    textChannel: TextChannel, 
    member: GuildMember, 
    roleName: string, 
    currentProficiencyRole: Role | undefined
  ) {
    member.roles.add(Roles.findRole(member, roleName));

    if (currentProficiencyRole !== undefined) {
      this.removeProficiencyRole(member, currentProficiencyRole);
    }

    Client.info(textChannel, `Your level is now ${roleName}.`);
  }

  /// Remove a proficiency role from the user
  removeProficiencyRole(member: GuildMember, proficiencyRole: Role) {
    member.roles.remove(proficiencyRole);
  }

  /// Check if the user has a role by passing its name
  hasRole(member: GuildMember, roleName: string): boolean {
    return member.roles.cache.some((role) => role.name.toLowerCase() === roleName);
  }

  /// Get the user's existent proficiency role
  getCurrentProficiencyRole(member: GuildMember): Role | undefined {
    return member.roles.cache.find((role) => roles.proficiency.includes(role.name.toLowerCase()));
  }

  /// Get tags of roles which are 'better' than the given role's index
  getTagsOfProficiencyRolesBetterThan(member: GuildMember, roleIndex: number): string[] {
    return roles.proficiency.filter(
      (_, index) => index > roleIndex).map((roleName) => Roles.toTag(Roles.findRole(member, roleName).id)
    );
  }

  /// Get tags of roles which are 'worse' than the given role's index
  getTagsOfProficiencyRolesWorseThan(member: GuildMember, roleIndex: number): string[] {
    return roles.proficiency.filter(
      (_, index) => index < roleIndex).map((roleName) => Roles.toTag(Roles.findRole(member, roleName).id)
    );
  }
}