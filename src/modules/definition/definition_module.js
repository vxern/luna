import axios from 'axios';
import cheerio from 'cheerio';

import { TeacherModule } from '../module.js';
import { TeacherClient } from '../../teacher/teacher.js';

import { capitaliseWords, areSimilar, joinArrayCoherently } from '../../language.js';

import * as config from './definition.js';

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
        let url = encodeURI(config.default.glosbeURL.replace('{word}', word));

        axios.get(url)
        .then((response) => {
            if (response.status !== 200) {
                TeacherClient.sendError(textChannel, {
                    message: 'Din motive neștiute, dexonline a decis să nu ne răspundă. :unamused:',
                });
                return;
            }
            
            // There must be at least one main translation, otherwise something has gone wrong
            TeacherClient.sendError(textChannel, {
                message: `Nu a fost găsită nicio definiție pentru cuvântul ${word}.`,
            });
            return;

            /*
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
            });*/
        }).catch((error) => {
            if (error.response.status === 404) {
                TeacherClient.sendError(textChannel, {
                    message: `Din păcate, definiția cuvântului ${word} nu a fost găsită.`,
                });
                return;
            }

            TeacherClient.sendError(textChannel, {
                message: 'A eșuat încercarea de a citi definiția.',
            });
            return;
        });
    }
}