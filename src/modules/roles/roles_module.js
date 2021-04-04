import { TeacherClient } from '../../teacher/teacher';
import { roles } from './roles';
import { capitaliseWords, joinArrayCoherently } from '../../utils';

// Concatenate the roles specified in roles.js into a single array
const allRoles = [].concat(
    roles.proficiency,
    roles.regions,
    roles.ethnicity,
    roles.abroad,
    roles.extension,
);

export class RolesModule {
    async handleMessage(message) {
        return await this.resolveRole(message.author, message.channel, message.content);
    }

    /// Match seeked role against a role specified in `allRoles`
    async resolveRole(user, textChannel, targetRole) {
        // If the seeked role is not found in `allRoles`
        if (!allRoles.includes(targetRole)) {
            return false;
        }

        // If the seeked role is not a proficiency
        if (!roles.proficiency.includes(targetRole)) {
            // If the user does not have a proficiency role
            if (!this.userHasProficiency(user)) {
                TeacherClient.sendEmbed(textChannel, message = 'In order to get any additional roles, you must first have a proficiency role');
                return true;
            }
            
            // If the user already has the seeked role
            if (this.userHasRole(user, targetRole)) {
                // Remove the seeked role from the user
                this.removeRole(user, targetRole);

                let message = `You no longer have the role '${capitaliseWords(targetRole)}'`;
                
                if (roles.regions.includes(targetRole)) {
                    message = `You are no longer from ${capitaliseWords(targetRole)}`;
                }

                if (roles.ethnicity.includes(targetRole)) {
                    message = `You are no longer from ${capitaliseWords(targetRole)}`;
                }

                if (roles.abroad.includes(targetRole)) {
                    message = `You are no longer a ${capitaliseWords(targetRole) + 'n'}`;
                }

                TeacherClient.sendEmbed(textChannel, message = `:sob: ${message} :sob:`);
                return true;
            }

            let message = `You now have the role '${capitaliseWords(targetRole)}'`;
            
            if (roles.regions.includes(targetRole)) {
                if (this.userHasEnoughRegions(user)) {
                    TeacherClient.sendWarning(textChannel, message = `You may not have more than ${roles.maximumRegions} region roles`);
                    return true;
                }

                message = `You are now from ${capitaliseWords(targetRole)}`;
            }

            if (roles.ethnicity.includes(targetRole)) {
                if (this.userHasEnoughEthnicities(user)) {
                    TeacherClient.sendWarning(textChannel, message = `You may not have of more than ${roles.maximumEthnicities} Romanian ${roles.maximumEthnicities > 1 ? 'ethnicities' : 'ethnicity'}`);
                    return true;
                }

                message = `You are now ${capitaliseWords(targetRole)}`;
            }

            if (roles.abroad.includes(targetRole)) {
                message = `You are now a ${capitaliseWords(targetRole) + 'n'}`
            }

            this.addRole(user, targetRole);

            TeacherClient.sendEmbed(textChannel, message = `:partying_face: ${message} :partying_face:`);
            return true;
        }

        if (!this.userHasProficiency(user)) {
            this.addRole(user, targetRole);

            TeacherClient.sendEmbed(textChannel, message = `Your level is now ${targetRole}`);
            return true;
        }

        // Find `targetRole` in the proficiency roles
        let proficiencyIndex = roles.proficiency.indexOf(targetRole);
        // Find user's current proficiency
        let proficiency = user.roles.cache.find(
            role => roles.proficiency.includes(role.name.toLowerCase())
        )?.name.toLowerCase();

        // If the user already has the same proficiency role
        if (this.userHasRole(user, targetRole)) {
            let baseMessage = `Your level is already ${targetRole} and you may instead `;
            let baseUpgradeMessage = ':arrow_double_up: upgrade to ';
            let baseDowngradeMessage = ':arrow_double_down: downgrade to ';

            // Find the names of the roles on either side of the pivot `index`
            let upgradeRoleNames = roles.proficiency.filter((_, index) => index > proficiencyIndex);
            let downgradeRoleNames = roles.proficiency.filter((_, index) => index < proficiencyIndex);

            // Create tags from role names by fetching the roles' ids
            let upgradeRoleTags = upgradeRoleNames.map((name) => `<@&${this.idOfRole(user, targetRole)}>`);
            let downgradeRoleTags = downgradeRoleNames.map((name) => `<@&${this.idOfRole(user, targetRole)}>`);

            if (upgradeRoleTags.length > 0) {
                baseUpgradeMessage += joinArrayCoherently(upgradeRoleTags);
                baseMessage += baseUpgradeMessage;
            }

            if (downgradeRoleTags.length > 0) {
                baseDowngradeMessage += joinArrayCoherently(downgradeRoleTags);
                baseMessage += baseDowngradeMessage;
            }

            TeacherClient.sendEmbed(textChannel, message = baseMessage);
            return true;
        }

        return false;
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
            (role) => roles.proficiency.includes(role.name.toLowerCase())
        );
    }
    
    /// Check if the user already has enough region roles
    userHasEnoughRegions(user) {
        return user.roles.cache.filter(
            (role) => roles.regions.includes(role.name.toLowerCase())
        ).size >= roles.maximumRegions;
    }
    
    /// Check if the user already has enough ethnnicity roles
    userHasEnoughEthnicities(user) {
        return user.roles.cache.filter(
            (role) => roles.ethnicity.includes(role.name.toLowerCase())
        ).size >= roles.maximumEthnicities;
    }
}

// Displays the roles that a user may join
function displayAvailableRoles(user, text_channel) {
    text_channel.send({
        embed:{
            color: color, 
            fields: [
                {
                    name: 'Proficiency', 
                    value: `${roles.roles_proficiency.join(', ')}`
                },
                (
                    userHasProficiency(user) ? 
                    [
                        {
                            name: 'General', 
                            value: `${roles.roles_general.sort().join(', ')}`
                        },
                        {   
                            name: 'Countries', 
                            value: `${roles.roles_countries.sort().join(', ')}`
                        },
                        {
                            name: 'Counties', 
                            value: `${roles.roles_regions.sort().join(', ')}`
                        },
                        {
                            name: 'Ethnicity', 
                            value: `${roles.roles_ethnicity.join(', ')}`
                        },
                        {
                            name: 'Abroad', 
                            value: `${roles.roles_abroad.join(', ')}`
                        }
                    ] : 
                    []
                )
            ]
        }
    });
}