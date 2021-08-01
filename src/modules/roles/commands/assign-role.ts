import { GuildMember, Message, Role, TextChannel } from "discord.js";

import { Client } from "../../../client/client";

import { Roles } from "../roles";
import { Command } from "../../command";

import { Utils } from "../../../utils";

import config from '../../../config.json';
import roles from '../../../roles.json';

export class AssignRole extends Command<Roles> {
  readonly identifier = '$roleName';
  readonly aliases = [];
  readonly description = 'Assigns or unassigns a role';
  readonly arguments = [];
  readonly dependencies = [];
  readonly handler = this.resolve;

  /// Resolve message to a single or multiple `resolveRole` calls
  async resolve(message: Message) {
    if (!message.content.includes(',')) {
      return this.resolveRole(message);
    }

    const roleNames = message.content.split(',').map(
      (roleName) => roleName.trim().toLowerCase()
    // Remove empty and duplicate entries
    ).filter(
      (roleName, index, array) => roleName.length !== 0 && index === array.indexOf(roleName)
    );

    if (roleNames.length === 0) {
      return;
    }

    if (roleNames.length > config.maximumRolesAtOnce) {
      Client.warn(message.channel as TextChannel, 
        'You may not request more than five roles at once'
      );
      return;
    }

    const requestedFromCategory = (category: string[]) => roleNames.filter(
      (roleName) => category.includes(roleName)
    ).length;

    if (requestedFromCategory(roles.proficiency) > 1) {
      Client.warn(message.channel as TextChannel, 
        'You may not request more than one proficiency role in a list expression'
      );
      return;
    }

    if (requestedFromCategory(roles.ethnicities) > roles.maximumEthnicityRoles) {
      Client.warn(message.channel as TextChannel, 
        `You may not request more than ${roles.maximumEthnicityRoles} ethnicity in a list expression`
      );
      return;
    }

    if (requestedFromCategory(roles.regions) > roles.maximumRegionRoles) {
      Client.warn(message.channel as TextChannel, 
        `You may not request more than ${roles.maximumRegionRoles} region roles in a list expression`
      );
      return;
    }

    for (const roleName of roleNames) {
      message.content = roleName;
      await new Promise((resolve) => setTimeout(resolve, config.roleAssignmentDelay * 1000));
      this.resolveRole(message);
    }

    return;
  }

  /// Resolve message to a `Role`; verify that the user can assign it; add it to the user, otherwise, remove it
  async resolveRole(message: Message) {
    const roleName = message.content.toLowerCase();

    // If the sought role is not found in [allRoles]
    if (!this.module.allRoles.includes(roleName)) {
      return;
    }

    // If the sought role is not a proficiency role
    if (!roles.proficiency.includes(roleName)) {
      return this.resolveNonProficiencyRole(message.channel as TextChannel, message.member!, roleName);
    }

    if (!this.hasRole(message.member!, roleName)) {
      const currentProficiencyRole = this.getCurrentProficiencyRole(message.member!);
      return this.addOrReplaceProficiencyRole(message.channel as TextChannel, message.member!, roleName, currentProficiencyRole);
    }

    let baseMessage = `Your level is already ${
      this.module.toTag(this.module.findRole(message.member!, roleName).id)
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

    Client.info(message.channel as TextChannel, baseMessage);
  }
  /// Assign or unassign a non-proficiency role
  resolveNonProficiencyRole(textChannel: TextChannel, member: GuildMember, roleName: string) {
    // If the user does not have a proficiency role yet
    if (!this.module.hasProficiency(member)) {
      return;
    }

    // If the user already has the sought role
    if (this.hasRole(member, roleName)) {
      return this.removeRole(textChannel, member, roleName);
    }

    return this.addRole(textChannel, member, roleName);
  }

  /// Add role to user by name
  addRole(textChannel: TextChannel, member: GuildMember, roleName: string) {
    member.roles.add(this.module.findRole(member, roleName));

    const capitalisedRoleName = Utils.capitaliseWords(roleName);

    let message = `You now have the role '${capitalisedRoleName}'`;

    if (roles.ethnicities.includes(roleName)) {
      if (this.hasEnoughEthnicityRoles(member)) {
        Client.warn(textChannel, `You may not be of more than ${roles.maximumEthnicityRoles} Romanian ethnicities at any given time`);
        return;
      }

      message = `You are now ${capitalisedRoleName}`;
    }

    if (roles.regions.includes(roleName)) {
      if (this.hasEnoughRegionRoles(member)) {
        Client.warn(textChannel, `You may not have more than ${roles.maximumRegionRoles} region roles at any given time`);
        return;
      }

      message = `You are now from ${capitalisedRoleName}`;
    }

    if (roles.abroad.includes(roleName)) {
      message = `You are now a ${roleName}`;
    }

    Client.info(textChannel, message + ` :partying_face:`);
  }

  /// Remove role from user by name
  removeRole(textChannel: TextChannel, member: GuildMember, roleName: string) {
    member.roles.remove(this.module.findRole(member, roleName));

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

    Client.info(textChannel, message + ` :sob:`);
  }

  /// Assign the user a proficiency role, or if the user already has one,
  /// replace it with the newly requested proficiency role
  addOrReplaceProficiencyRole(
    textChannel: TextChannel, 
    member: GuildMember, 
    roleName: string, 
    currentProficiencyRole: Role | undefined
  ) {
    member.roles.add(this.module.findRole(member, roleName));

    if (currentProficiencyRole !== undefined) {
      this.removeProficiencyRole(member, currentProficiencyRole);
    }

    Client.info(textChannel, `Your level is now ${roleName}`);
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
      (_, index) => index > roleIndex).map((roleName) => this.module.toTag(this.module.findRole(member, roleName).id)
    );
  }

  /// Get tags of roles which are 'worse' than the given role's index
  getTagsOfProficiencyRolesWorseThan(member: GuildMember, roleIndex: number): string[] {
    return roles.proficiency.filter(
      (_, index) => index < roleIndex).map((roleName) => this.module.toTag(this.module.findRole(member, roleName).id)
    );
  }

  /// Check if the user already has the maximum number of ethnicity roles
  hasEnoughEthnicityRoles(member: GuildMember): boolean {
    return member.roles.cache.filter(
      (role) => roles.ethnicities.includes(role.name.toLowerCase())
    ).size >= roles.maximumEthnicityRoles;
  }

  /// Check if the user already has the maximum number of region roles
  hasEnoughRegionRoles(member: GuildMember): boolean {
    return member.roles.cache.filter(
      (role) => roles.regions.includes(role.name.toLowerCase())
    ).size >= roles.maximumRegionRoles;
  }
}