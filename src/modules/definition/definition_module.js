import axios from 'axios';
import cheerio from 'cheerio';

import { TeacherModule } from '../module.js';
import { TeacherClient } from '../../teacher/teacher.js';

import { capitaliseWords, areSimilar, joinArrayCoherently } from '../../language.js';

import definition, * as config from './definition.js';

export class DefinitionModule extends TeacherModule {
    async handleMessage(message) {
        return await super.resolveCommand(message.content, {
            'translate': {
                '$seekedWord': (seekedWord) => this.searchGlosbeDefinition(message.channel, seekedWord),
            },
            'dex': {
                '$seekedWord': (seekedWord) => this.searchDexDefinition(message.channel, seekedWord),
            }
        });
    }

    async searchGlosbeDefinition(textChannel, word) {
        // Supplant word into the url template
        let url = encodeURI(config.default.glosbeURL.replace('{word}', word));

        axios.get(url)
        .then((response) => {
            if (response.status !== 200) {
                TeacherClient.sendError(textChannel, {
                    message: 'For some obscure reason, glosbe.com chose to throw an error. :unamused:',
                });
                return;
            }
            
            // Initialise cheerio with the response data
            let $ = cheerio.load(response.data);

            // Find the main translations displayed by glosbe in their raw format
            let mainTranslationsRaw = $(config.default.glosbeSelectorMainList).find(config.default.glosbeSelectorMainTranslations);
            // Extract the useful data in the form of translations
            let mainTranslations = mainTranslationsRaw.map((_, element) => $(element).attr('data-translation')).toArray();

            // Find the additional translations displayed by glosbe in a list
            let expandedTranslations = $(config.default.glosbeSelectorExpandedList).text().replace(/[\n\r]/g, '').split('·');

            // Remove similar / identical terms from the main translations
            mainTranslations = [mainTranslations[0], ...mainTranslations.filter((translation) => !areSimilar(mainTranslations[0], translation))];

            // There must be at least one main translation, otherwise something has gone wrong
            if (mainTranslations.length === 0) {
                TeacherClient.sendError(textChannel, {
                    message: `No translations found for ${word}.`,
                });
                return;
            }

            TeacherClient.sendEmbed(textChannel, {
                fields: [
                    {
                        name: `Translations of ${word}`,
                        value: Array.from(
                                    // Show at most `maximumTranslations` translations
                                    Array(Math.min(config.default.maximumTranslations, mainTranslations.length)), 
                                    (_, i) => `${i + 1} ~ ${mainTranslations[i]}`
                                ).join('\n'),
                    },
                    {
                        name: `Additional translations`,
                        value: expandedTranslations[0] !== '' ? expandedTranslations.join(', ') : 'No additional translations',
                    },
                ]
            });
        }).catch((error) => {
            if (error.response.status === 404) {
                TeacherClient.sendError(textChannel, {
                    message: 'Term not found on glosbe.',
                });
                return;
            }

            TeacherClient.sendError(textChannel, {
                message: 'Failed to retrieve term.',
            });
            return;
        });
    }

    // Dexonline is a monolingual dictionary, therefore the responses are served in Romanian
    async searchDexDefinition(textChannel, word) {
        // Supplant word into the url template
        let url = encodeURI(config.default.dexonlineURL.replace('{word}', word));

        axios.get(url)
        .then((response) => {
            if (response.status !== 200) {
                TeacherClient.sendError(textChannel, {
                    message: 'Din motive necunoscute, dexonline a decis să nu ne răspundă. :unamused:',
                });
                return;
            }
            
            if (response.data.definitions.length === 0) {
                // There must be at least one main translation, otherwise something has gone wrong
                TeacherClient.sendError(textChannel, {
                    message: `Nu există o definiție pentru cuvântul ${word}.`,
                });
                return;
            }

            // For example @1.@ or @2@
            let numberPoint = /(@[0-9]\.?@)+/g;

            // Find the content of the entry with the most definitions available
            let longestDefinition = response.data.definitions
                .reduce((previous, current) => {
                    let previousDefinitions = previous.internalRep.match(numberPoint)?.length;
                    let currentDefinitions = current.internalRep.match(numberPoint)?.length;

                    if (previousDefinitions === undefined && currentDefinitions === undefined) {
                        return current.internalRep.length > previous.internalRep.length ? current : previous;
                    }

                    if (previousDefinitions === undefined && currentDefinitions !== undefined) {
                        return current;
                    }

                    if (previousDefinitions !== undefined && currentDefinitions === undefined) {
                        return previous;
                    }

                    return currentDefinitions > previousDefinitions ? current : previous;
                })
                .internalRep;

            // If the definition does not include line breaks, and therefore
            // doesn't split its definitions for us, we cannot split it 
            // where line breaks are.
            if (!longestDefinition.includes('\n')) {
                let extractedDefinitions = longestDefinition
                    // Split at number points in the list
                    .split(numberPoint)
                    // Remove the number points from the list
                    .filter(definitionWithNoise => !definitionWithNoise.match(numberPoint))
                    // Remove the unneeded metadata from the beginning of the definition
                    .splice(1)
                    // Get only the first sentence of each definition with noise
                    .map(definitionWithNoise => definitionWithNoise.split('.')[0] + '.');
                // Create printable array by adding indexes and newlines
                longestDefinition = Array.from(
                    // Show at most `maximumDefinitions` definitions
                    Array(Math.min(config.default.maximumDefinitions, extractedDefinitions.length)), 
                    (_, i) => `${i + 1} ~ ${extractedDefinitions[i]}`
                ).join('\n');
            } else {
                // Split at new lines
                let extractedDefinitions = longestDefinition.replace(numberPoint, '').split('\n').splice(2);
                // Discard overflow of definitions
                longestDefinition = Array.from(
                    // Show at most `maximumDefinitions` definitions
                    Array(Math.min(config.default.maximumDefinitions, extractedDefinitions.length)), 
                    (_, i) => `${i + 1} ~ ${extractedDefinitions[i]}`
                ).join('\n');
            }

            // Parse dexonline symbols to discord format marks
            longestDefinition = longestDefinition
                .replaceAll('#', '__')
                .replaceAll('@', '**')
                .replaceAll('%', '**')
                .replaceAll('$', '*');

            TeacherClient.sendEmbed(textChannel, {
                fields: [
                    {
                        name: `Definiția cuvântului ${word}`,
                        value: longestDefinition,
                    },
                ]
            });
        }).catch((error) => {
            console.log(error);

            if (error.response.status === 404) {
                TeacherClient.sendError(textChannel, {
                    message: `N-am putut găsi definiția cuvântului ${word}.`,
                });
                return;
            }

            TeacherClient.sendError(textChannel, {
                message: 'Încercarea de a citi definiția a eșuat.',
            });
            return;
        });
    }
}