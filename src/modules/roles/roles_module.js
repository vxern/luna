import { TeacherClient } from '../../teacher/teacher.js';
import * as roles from './roles.js';

import { capitaliseWords, areSimilar, joinArrayCoherently } from '../../language.js';

// Concatenate the roles specified in roles.js into a single array
const allRoles = [].concat(
    roles.default.proficiency,
    roles.default.regions,
    roles.default.ethnicity,
    roles.default.abroad,
    roles.default.extension,
);

export class RolesModule {
    async handleMessage(message) {
        if (areSimilar('roles', message.content)) {
            this.displayAvailableRoles(message.member, message.channel);
            return true;
        }

        return await this.resolveRole(message.member, message.channel, message.content);
    }

    /// Match seeked role against a role specified in `allRoles`
    async resolveRole(user, textChannel, targetRole) {
        // If the seeked role is not found in `allRoles`
        if (!allRoles.includes(targetRole)) {
            return false;
        }

        // If the seeked role is not a proficiency
        if (!roles.default.proficiency.includes(targetRole)) {
            // If the user does not have a proficiency role
            if (!this.userHasProficiency(user)) {
                TeacherClient.sendEmbed(textChannel, {message: 'In order to get any additional roles, you must first have a proficiency role'});
                return true;
            }
            
            // If the user already has the seeked role
            if (this.userHasRole(user, targetRole)) {
                // Remove the seeked role from the user
                this.removeRole(user, targetRole);

                let message = `You no longer have the role '${capitaliseWords(targetRole)}'`;
                
                if (roles.default.regions.includes(targetRole)) {
                    message = `You are no longer from ${capitaliseWords(targetRole)}`;
                }

                if (roles.default.ethnicity.includes(targetRole)) {
                    message = `You are no longer from ${capitaliseWords(targetRole)}`;
                }

                if (roles.default.abroad.includes(targetRole)) {
                    message = `You are no longer a ${capitaliseWords(targetRole) + 'n'}`;
                }

                TeacherClient.sendEmbed(textChannel, {message: `:sob: ${message} :sob:`});
                return true;
            }

            let message = `You now have the role '${capitaliseWords(targetRole)}'`;
            
            if (roles.default.regions.includes(targetRole)) {
                if (this.userHasEnoughRegions(user)) {
                    TeacherClient.sendWarning(textChannel, {message: `You may not have more than ${roles.default.maximumRegions} region roles`});
                    return true;
                }

                message = `You are now from ${capitaliseWords(targetRole)}`;
            }

            if (roles.default.ethnicity.includes(targetRole)) {
                if (this.userHasEnoughEthnicities(user)) {
                    TeacherClient.sendWarning(textChannel, {message: `You may not be of more than ${roles.default.maximumEthnicities} Romanian ${roles.default.maximumEthnicities > 1 ? 'ethnicities' : 'ethnicity'}`});
                    return true;
                }

                message = `You are now ${capitaliseWords(targetRole)}`;
            }

            if (roles.default.abroad.includes(targetRole)) {
                message = `You are now a ${capitaliseWords(targetRole) + 'n'}`
            }

            this.addRole(user, targetRole);

            TeacherClient.sendEmbed(textChannel, {message: `:partying_face: ${message} :partying_face:`});
            return true;
        }
        
        let currentProficiency = user.roles.cache.find(
            role => roles.default.proficiency.includes(role.name.toLowerCase())
        )?.name.toLowerCase();

        if (!this.userHasRole(user, targetRole)) {
            this.addRole(user, targetRole);
            this.removeRole(user, currentProficiency);

            TeacherClient.sendEmbed(textChannel, {message: `Your level is now ${targetRole}`});
            return true;
        }

        // Find `targetRole` in the proficiency roles
        let proficiencyIndex = roles.default.proficiency.indexOf(targetRole);

        // If the user already has the same proficiency role
        if (this.userHasRole(user, targetRole)) {
            let baseMessage = `Your level is already ${targetRole} and you may instead `;
            let baseUpgradeMessage = ':arrow_double_up: upgrade to ';
            let baseDowngradeMessage = ':arrow_double_down: downgrade to ';

            // Find the names of the roles on either side of the pivot `index`
            let upgradeRoleNames = roles.default.proficiency.filter((_, index) => index > proficiencyIndex);
            let downgradeRoleNames = roles.default.proficiency.filter((_, index) => index < proficiencyIndex);

            // Create tags from role names by fetching the roles' ids
            let upgradeRoleTags = upgradeRoleNames.map((name) => this.idOfRole(user, name));
            let downgradeRoleTags = downgradeRoleNames.map((name) => this.idOfRole(user, name));

            if (upgradeRoleTags.length > 0) {
                baseUpgradeMessage += joinArrayCoherently(upgradeRoleTags);
                baseMessage += baseUpgradeMessage;

                if (downgradeRoleTags.length > 0) {
                    baseMessage += ' or ';
                }
            }

            if (downgradeRoleTags.length > 0) {
                baseDowngradeMessage += joinArrayCoherently(downgradeRoleTags);
                baseMessage += baseDowngradeMessage;
            }

            TeacherClient.sendEmbed(textChannel, {message: baseMessage});
            return true;
        }

        return false;
    }

    /// Displays all available roles in a list
    async displayAvailableRoles(user, textChannel) {
        TeacherClient.sendEmbed(textChannel, {fields: [
            {
                name: 'Proficiency', 
                value: `${roles.default.proficiency.join(', ')}`
            },
            this.userHasProficiency(user) ? 
            [
                {
                    name: roles.default.maximumRegions > 1 ? 'Regions': 'Region', 
                    value: `${roles.default.regions.sort().join(', ')}`
                },
                {
                    name: roles.default.maximumEthnicities > 1 ? 'Ethnicities' : 'Ethnicity', 
                    value: `${roles.default.ethnicity.join(', ')}`
                },
                {
                    name: 'Abroad', 
                    value: `${roles.default.abroad.join(', ')}`
                },
                {
                    name: 'Extension', 
                    value: `${roles.default.extension.join(', ')}`
                },
            ] : 
            []
            
        ]});
    }

    /// Adds a role to user
    async addRole(user, targetRole) {
        await user.roles.add(
            user.guild.roles.cache.find((role) => role.name.toLowerCase() === targetRole)
        );
    }

    /// Removes a role from user
    async removeRole(user, targetRole) {
        await user.roles.remove(
            user.roles.cache.find((role) => role.name.toLowerCase() === targetRole)
        );
    }

    /// Takes the name of a role and returns its id
    idOfRole(user, targetRole) {
        return user.guild.roles.cache.find(
            (role) => role.name.toLowerCase() === targetRole
        );
    }

    /// Check if the user has a role
    userHasRole(user, targetRole) {
        return user.roles.cache.some(
            (role) => role.name.toLowerCase() === targetRole
        );
    }

    /// Check if the user has a proficiency
    userHasProficiency(user) {
        return user.roles.cache.some(
            (role) => roles.default.proficiency.includes(role.name.toLowerCase())
        );
    }
    
    /// Check if the user already has enough region roles
    userHasEnoughRegions(user) {
        return user.roles.cache.filter(
            (role) => roles.default.regions.includes(role.name.toLowerCase())
        ).size >= roles.default.maximumRegions;
    }
    
    /// Check if the user already has enough ethnnicity roles
    userHasEnoughEthnicities(user) {
        return user.roles.cache.filter(
            (role) => roles.default.ethnicity.includes(role.name.toLowerCase())
        ).size >= roles.default.maximumEthnicities;
    }
}