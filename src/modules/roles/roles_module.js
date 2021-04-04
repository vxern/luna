import { TeacherClient } from '../../teacher/teacher';
import { roles } from './roles';
import '../../utils';

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
        // If the seeked role is not found in `allRoles`
        if (!allRoles.includes(message.content)) {
            return false;
        }

        return await this.resolveRole(message.author, message.channel, message.content);
    }

    /// Match seeked role against a role specified in `allRoles`
    async resolveRole(user, textChannel, targetRole) {
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

        // If the seeked role is not a proficiency

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

// Resolves a role from the name 'target_role'
async function resolveRole(user, text_channel, target_role) {
    if (all_roles.includes(target_role)) {
        // If role is a proficiency role
        if (roles.roles_proficiency.includes(target_role)) {
            let proficiency_index = roles.roles_proficiency.indexOf(target_role);
            let previous_proficiency = user.roles.cache.find(role => roles.roles_proficiency.includes(role.name.toLowerCase()))?.name.toLowerCase();
            if (userHasProficiency(user) && userHasRole(user, target_role)) {
                let base = `Your level is already ${target_role} and you may instead `;
                switch (proficiency_index) {
                    case 3:
                        text_channel.send({
                            embed: {
                                color: color, 
                                description: base + `:arrow_double_down: downgrade to ${advanced_tag}, ${intermediate_tag} or ${beginner_tag}`
                            }
                        });
                        return;
                    case 2:
                        text_channel.send({
                            embed: {
                                color: color, 
                                description: base + `:arrow_double_up: upgrade to ${native_tag} or :arrow_double_down: downgrade to ${intermediate_tag} or ${beginner_tag}`
                            }
                        });
                        return;
                    case 1:
                        text_channel.send({
                            embed: {
                                color: color, 
                                description: base + `:arrow_double_up: upgrade to ${advanced_tag} or ${native_tag} or :arrow_double_down: downgrade to ${beginner_tag}`
                            }
                        });
                        return;
                    case 0:
                        text_channel.send({
                            embed: {
                                color: color, 
                                description: base + `:arrow_double_up: upgrade to ${intermediate_tag}, ${advanced_tag} or ${native_tag}`
                            }
                        });
                        return;
                }
            } else {
                addRole(user, target_role);
                if (previous_proficiency) {
                    removeRole(user, previous_proficiency);
                }
                text_channel.send({
                    embed: {
                        color: color, 
                        description: `Your level is now ${target_role}.`
                    }
                });
            }
        } else if (userHasProficiency(user)) {
            if (userHasRole(user, target_role)) {
                let message = '';
                if (roles.roles_general.includes(target_role)) {
                    message = `You no longer have the role '${language.capitalise(target_role)}'`;
                } else if (roles.roles_regions.includes(target_role) || roles.roles_countries.includes(target_role)) {
                    message = `You are no longer from ${language.capitalise(target_role)}`;
                } else if (roles.roles_ethnicity.includes(target_role)) {
                    message = `You are no longer ${language.capitalise(target_role)}`;
                } else if (roles.roles_abroad.includes(target_role)) {
                    message = `You are no longer a ${language.capitalise(target_role) + 'n'}`;
                }
                removeRole(user, target_role);
                text_channel.send({
                    embed: {
                        color: color, 
                        description: `:sob: ${message} :sob:`
                    }
                });
            } else {
                let message = '';
                if (roles.roles_general.includes(target_role)) {
                    message = `You now have the role '${language.capitalise(target_role)}'`;
                } else if (roles.roles_regions.includes(target_role)) {
                    // Check if user already has two region roles
                    if (userHasEnoughRegions(user)) {
                        text_channel.send({
                            embed: {
                                color: color, 
                                description: `:exclamation: You may only have two region roles.`
                            }
                        });
                        return;
                    }
                    message = `You are now from ${language.capitalise(target_role)}`;
                } else if (roles.roles_countries.includes(target_role)) {
                    // Check if user already has two country roles
                    if (userHasEnoughCountries(user)) {
                        text_channel.send({
                            embed: {
                                color: color, 
                                description: `:exclamation: You may only have two country roles.`
                            }
                        });
                        return;
                    }
                    message = `You are now from ${language.capitalise(target_role)}`;
                } else if (roles.roles_ethnicity.includes(target_role)) {
                    // Check if user already has an ethnicity
                    if (userHasEthnicity(user)) {
                        text_channel.send({
                            embed: {
                                color: color, 
                                description: `:exclamation: You may only be of one Romanian ethnicity.`
                            }
                        });
                        return;
                    }
                    message = `You are now ${language.capitalise(target_role)}`;
                } else if (roles.roles_abroad.includes(target_role)) {
                    message = `You are now a ${language.capitalise(target_role) + 'n'}`;
                }
                addRole(user, target_role);
                text_channel.send({
                    embed: {
                        color: color, 
                            description: `:partying_face: ${message} :partying_face:`
                    }
                });
            }
        } else {
            text_channel.send({
                embed: {
                    color: color, 
                        description: 'In order to get any additional roles, you must first have a proficiency role.'
                }
            });
        }
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