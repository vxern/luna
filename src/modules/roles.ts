import { EmbedField, GuildMember, Role } from 'discord.js';

import { LunaModule } from './module';
import { LunaClient } from '../client/client';
import { Embed } from '../structs/embed';

import { Language } from '../language';

import roles from '../roles.json';

// Concatenate the roles specified in [roles.json] into a single array
const allRoles = ([] as string[]).concat(
  roles.proficiency,
  roles.regions,
  roles.ethnicities,
  roles.abroad,
  roles.miscellaneous,
);

export class RolesModule extends LunaModule {
  commandTree = {
    'roles': () => this.displayRoles(),
    '%roleName': (roleName: string) => this.resolveRole(roleName),
  };

  displayRoles(): boolean {
    let fields: EmbedField[] = [
      {
        name: 'Proficiency',
        value: roles.proficiency.join(', '),
        inline: true,
      },
    ];

    if (this.hasProficiency()) {
      fields.push(
        ...Object.entries(roles).slice(3).map<EmbedField>(([key, value]) => {
          return {
            name: Language.capitaliseWords(key),
            value: (value as string[]).join(', '),
            inline: true,
          }
        })
      );
    }

    LunaClient.info(this.args['textChannel'], new Embed({fields: fields}));
    return true;
  }

  async resolveRole(roleName: string): Promise<boolean> {
    roleName = roleName.toLowerCase();

    console.info(roleName);

    // If the sought role is not found in [allRoles]
    if (!allRoles.includes(roleName)) {
      return false;
    }

    // If the sought role is not a proficiency role
    if (!roles.proficiency.includes(roleName)) {
      return await this.resolveNonProficiencyRole(roleName);
    }

    if (!this.hasRole(roleName)) {
      const currentProficiencyRole = this.getCurrentProficiencyRole();
      return await this.addOrReplaceProficiencyRole(roleName, currentProficiencyRole);
    }

    let message = `Your level is already ${roleName} and you may instead `;
    let upgradeMessage = ':arrow_double_up: upgrade to ';
    let downgradeMessage = ':arrow_double_down: downgrade to ';

    const indexOfProficiencyRole = roles.proficiency.indexOf(roleName);

    const roleTagsToUpgradeTo: string[] = this.getTagsOfProficiencyRolesBetterThan(indexOfProficiencyRole);
    const roleTagsToDowngradeTo: string[] = this.getTagsOfProficiencyRolesWorseThan(indexOfProficiencyRole);

    if (roleTagsToUpgradeTo.length !== 0) {
      upgradeMessage += Language.join(roleTagsToUpgradeTo);
      message += upgradeMessage;

      if (roleTagsToDowngradeTo.length !== 0) {
        message += ' or ';
      }
    }

    if (roleTagsToDowngradeTo.length !== 0) {
      downgradeMessage += Language.join(roleTagsToDowngradeTo);
      message += downgradeMessage;
    }

    LunaClient.info(this.args['textChannel'], new Embed({message: message}));
    return true;
  }

  async resolveNonProficiencyRole(roleName: string): Promise<boolean> {
    // If the user does not have a proficiency role yet
    if (!this.hasProficiency()) {
      return true;
    }

    // If the user already has the sought role
    if (this.hasRole(roleName)) {
      return await this.removeRole(roleName);
    }

    return await this.addRole(roleName);
  }

  async addRole(roleName: string): Promise<boolean> {
    const member: GuildMember = this.args['member'];
    await member.roles.add(this.findRole(roleName));

    const capitalisedRoleName = Language.capitaliseWords(roleName);

    let message = `You now have the role '${capitalisedRoleName}'`;

    if (roles.ethnicities.includes(roleName)) {
      if (this.hasEnoughEthnicityRoles()) {
        LunaClient.warn(this.args['textChannel'], new Embed({
          message: `You may not be of more than ${roles.maximumEthnicityRoles} Romanian ethnicities at any given time`,
        }));
        return true;
      }

      message = `You are now ${capitalisedRoleName}`;
    }

    if (roles.regions.includes(roleName)) {
      if (this.hasEnoughRegionRoles()) {
        LunaClient.warn(this.args['textChannel'], new Embed({
          message: `You may not have more than ${roles.maximumRegionRoles} region roles at any given time`,
        }));
        return true;
      }

      message = `You are now from ${capitalisedRoleName}`;
    }

    if (roles.abroad.includes(roleName)) {
      message = `You are now a ${roleName}`;
    }

    LunaClient.info(this.args['textChannel'], new Embed({message: message + ` :partying_face:`}));
    return true;
  }

  async removeRole(roleName: string): Promise<boolean> {
    const member: GuildMember = this.args['member'];
    await member.roles.remove(this.findRole(roleName));

    const capitalisedRoleName = Language.capitaliseWords(roleName);

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

    LunaClient.info(this.args['textChannel'], new Embed({message: message + ` :sob:`}));
    return true;
  }

  async addOrReplaceProficiencyRole(roleName: string, currentProficiencyRole: Role | undefined): Promise<boolean> {
    const member: GuildMember = this.args['member'];
    await member.roles.add(this.findRole(roleName));

    if (currentProficiencyRole !== undefined) {
      await this.removeProficiencyRole(currentProficiencyRole);
    }

    LunaClient.info(this.args['textChannel'], new Embed({message: `Your level is now ${roleName}`}));
    return true;
  }

  async removeProficiencyRole(proficiencyRole: Role): Promise<boolean> {
    const member: GuildMember = this.args['member'];
    await member.roles.remove(proficiencyRole);
    return true;
  }

  findRole(roleName: string): Role {
    const member: GuildMember = this.args['member'];
    return member.guild.roles.cache.find((role) => role.name.toLowerCase() === roleName)!;
  }

  hasRole(roleName: string): boolean {
    const member: GuildMember = this.args['member'];
    return member.roles.cache.some((role) => role.name.toLowerCase() === roleName);
  }

  hasProficiency(): boolean {
    const member: GuildMember = this.args['member'];
    return member.roles.cache.some((role) => roles.proficiency.includes(role.name.toLowerCase()))
  }

  getCurrentProficiencyRole(): Role | undefined {
    const member: GuildMember = this.args['member'];
    return member.guild.roles.cache.find(
      (role) => roles.proficiency.includes(role.name.toLowerCase())
    );
  }

  getTagsOfProficiencyRolesBetterThan(roleIndex: number) {
    return roles.proficiency.filter((_, index) => index > roleIndex).map((roleName) => this.findRole(roleName).id);
  }

  getTagsOfProficiencyRolesWorseThan(roleIndex: number) {
    return roles.proficiency.filter((_, index) => index < roleIndex).map((roleName) => this.findRole(roleName).id);
  }

  hasEnoughEthnicityRoles(): boolean {
    const member: GuildMember = this.args['member'];
    return member.roles.cache.filter(
      (role) => roles.regions.includes(role.name.toLowerCase())
    ).size >= roles.maximumEthnicityRoles;
  }

  hasEnoughRegionRoles(): boolean {
    const member: GuildMember = this.args['member'];
    return member.roles.cache.filter(
      (role) => roles.regions.includes(role.name.toLowerCase())
    ).size >= roles.maximumRegionRoles;
  }
}