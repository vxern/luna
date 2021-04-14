import axios from 'axios';
import cheerio from 'cheerio';

import { TeacherModule } from '../module.js';
import { TeacherClient } from '../../teacher/teacher.js';

import { capitaliseWords, areSimilar, joinArrayCoherently } from '../../language.js';

import * as config from './definition.js';

export class DefinitionModule extends TeacherModule {
    async handleMessage(message) {
        return await super.resolveCommand(message.content, {
            'word': {
                '$seekedWord': (seekedWord) => this.searchDexDefinition(message.channel, seekedWord),
            },
        });
    }

    async searchDexDefinition(textChannel, word) {
        // Supplant word into the url template
        let url = encodeURI(config.default.dexonlineURL.replace('{word}', word));

        axios.get(url).then((response) => {
            if (response.status !== 200) {
                TeacherClient.sendError(textChannel, {
                    message: 'For some obscure reason, dexonline.ro chose to throw an error. :unamused:',
                });
                return;
            }

            const $ = cheerio.load(response.data);

            let definitionRaw = 
                // Find definition wrappers
                $('div.defWrapper')
                // Navigate to paragraph > span
                .find('p > span')
                // Get the first definition wrapper
                .first();

            let textRaw = definitionRaw.text();

            let phrases = textRaw.match(/[-\p{L}!$%^&*_+|~=`:";'<>?,.\/ ]+/gu);
            
            let definitions = [];

            phrases.forEach((phrase) => {
                if (phrase.startsWith('.')) {
                    definitions.push(phrase.substring(2));
                    return;
                }
            });
            
            TeacherClient.sendEmbed(textChannel, {
                fields: {
                    name: `Definiții pentru ${word}`,
                    value: Array.from(
                        // Show at most `maximumDefinitions` definitions
                        Array(Math.min(config.default.maximumDefinitions, definitions.length)), 
                        (_, i) => `${i + 1} ~ ${definitions[i]}`
                    ).join('\n'),
                }
            });
        }).catch((error) => {
            if (error.response.status === 404) {
                TeacherClient.sendError(textChannel, {
                    message: 'Term not found on dexonline.',
                });
                return;
            }

            TeacherClient.sendError(textChannel, {
                message: 'Failed to retrieve term.',
            });
            return;
        });
    }

    // TODO: Add Glosbe
}