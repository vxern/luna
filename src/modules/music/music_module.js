import ytdl from 'ytdl-core';
import { YTSearcher } from 'ytsearcher';
import { areSimilar } from '../../language.js';

import { TeacherClient } from '../../teacher/teacher.js';
import { TeacherModule } from "../module.js";

// Music configs
import * as config from './music.js';

// Construct searcher for finding youtube videos
const searcher = new YTSearcher({
    key: process.env.YOUTUBE_SECRET,
    revealkey: true,
})

export class MusicModule extends TeacherModule {
    constructor() {
        super();
        this.textChannel = null;
        this.voiceChannel = null;
        this.voiceConnection = null;

        this.currentSong = null;
        this.queue = [];
    }

    async handleMessage(message) {
        return await super.resolveCommand(message.content, {
            precheck: () => this.isInVoiceChannel(message.channel, message.member.voice.channel),
            commands: {
                'play': {
                    '': async () => await this.play(message.channel, message.member, 
                        {searchResult: await this.searchSong(message.channel, message.author),}
                    ),
                    '$songName': async (songName) => await this.play(message.channel, message.member, 
                        {searchResult: await this.searchSong(message.channel, message.author, songName),}
                    ),
                },
                'replay': async () => await this.replay(message.channel, message.member),
                'pause': async () => await this.pause(message.channel),
                'skip': async () => await this.skip(message.channel),
                'remove': {
                    '$identifier': async (identifier) => await this.removeFromQueue(message.channel, identifier),
                },
                
                'forward': {
                    '$time': async (time) => await this.forward(message.channel, message.member, time),
                },
                'rewind': {
                    '$time': async (time) => await this.rewind(message.channel, message.member, time),
                },
                'volume': {
                    '$volume': async (volume) => await this.setVolume(message.channel, volume),
                },

                'queue': async () => await this.displayQueue(message.channel),
            }
        });
    }

    /// Searches for a song, asks the user to pick the song and returns `YTSearch` or `undefined`
    async searchSong(textChannel, user, songName) {
        if (songName === undefined) {
            TeacherClient.sendWarning(textChannel, {
                message: 'You have not specified a song name.'
            });
            return null;
        }

        if (songName.length <= 3) {
            TeacherClient.sendTip(textChannel, {
                message: `The song name you've specified is very short. It may be difficult to find the requested song.`,
            });
        }

        if (songName.length > 40) {
            TeacherClient.sendError(textChannel, {
                message: `That does not look like a song name.`,
            });
            return null;
        }
        
        if (songName.startsWith('https://') || songName.startsWith('http://')) {
            TeacherClient.sendWarning(textChannel, {
                message: 'Playing from links is not supported. Please search a song by its .',
            });
            return null;
        }

        let searchResults;

        try {
            // Obtain search results
            searchResults = (await searcher.search(songName)).currentPage.slice(0, config.default.maximumSearchResults);

            // Replace encoded quote marks
            searchResults.map((song) => song.title = song.title.replace('&quot;', `'`));
        } catch {
            TeacherClient.sendError(textChannel, {
                message: 'An error occurred while attempting to resolve the name of a song to its url.\n\n' +
                         'Consider renewing the YouTube token.',
            });
            return null;
        }
        
        if (searchResults.length === 0) {
            TeacherClient.sendTip(textChannel, {
                message: 'No results found. Try refining your search.',
            });
            return null;
        } 

        TeacherClient.sendEmbed(textChannel, {
            // Generate fields
            fields: {
                name: 'Select a song below by writing its index.',
                value: Array.from(Array(searchResults.length), (_, i) => `${i + 1} ~ ${searchResults[i].title}`).join('\n\n'),
            }
        });

        // Listen for a message containing an index from the user
        let message = await textChannel.awaitMessages(
            message => !isNaN(message) && message.author.id === user.id, 
            { max: 1, time: config.default.queryTimeout * 1000 }
        ).catch();

        // Extract index from message content
        let index = message?.first()?.content;

        if (!this.validateIndex(textChannel, index, searchResults)) {
            return null;
        }

        return searchResults[index - 1];
    }

    /// Plays a song. If `playNext` is set to true, the next song will be played
    async play(textChannel, member, {searchResult = undefined, playNext = false} = {}) {
        // `searchSong` yielded `null`, song hasn't been found
        if (searchResult === null) {
            return true;
        }
        
        // If the queue is moving up, set `song` to the next song in queue
        // Otherwise, create a song from the searchResult
        if (searchResult !== undefined) {
            let song = searchResult;
            song.offset = 0;

            // If there is a song playing, add to queue instead
            if (this.currentSong) {
                await this.addToQueue(textChannel, song);
                return true;
            }

            this.currentSong = song;
        } 

        // If the `play` function has been called with a `playNext` flag set to true,
        // we must erase the current playing song
        if (playNext) {
            this.currentSong = null;
            
            // There are no more songs to play, return
            if (this.queue.length === 0) {
                return true;
            }
            
            this.currentSong = this.queue.shift();
        }

        TeacherClient.sendEmbed(textChannel, {
            message: `Now playing '${this.currentSong.title}'...`
        });

        await this.joinVoiceChannel(member);

        this.voiceConnection.play(
            ytdl(this.currentSong.url, {
                filter: 'audioonly',
                quality: 'highestaudio',
            }),
            {seek: this.currentSong.offset, },
        ).on('finish', async () => {
            this.play(textChannel, member, {playNext: true});
        }).on('error', async () => {
            TeacherClient.sendError(textChannel, {
                message: `Could not stream song '${this.currentSong.title}'.`
            });
            
            this.play(textChannel, member, {playNext: true});
        });

        return true;
    }

    /// Replays a song by moving the offset to 0
    async replay(textChannel, member) {
        if (!this.isPlaying(textChannel)) {
            return;
        }

        this.currentSong.offset = 0;
        this.play(textChannel, member);
    }

    /// Pauses or resumes song
    async pause(textChannel) {
        if (!this.isPlaying(textChannel)) {
            return;
        }

        if (this.voiceConnection.dispatcher.paused) {
            // TODO: Fix this disgusting hack
            // https://github.com/discordjs/discord.js/issues/5300
            this.voiceConnection.dispatcher.resume();
            this.voiceConnection.dispatcher.pause();
            this.voiceConnection.dispatcher.resume();
            TeacherClient.sendEmbed(textChannel, {
                message: 'Resumed song',
            });
            return; 
        }

        this.voiceConnection.dispatcher.pause();
        TeacherClient.sendEmbed(textChannel, {
            message: 'Paused song.',
        });
        return;
    }

    /// Skips a song and plays the first one in the queue
    async skip(textChannel) {
        if (!this.isPlaying(textChannel)) {
            return;
        }

        TeacherClient.sendEmbed(textChannel, {
            message: `Skipping '${this.currentSong.title}'...`
        });

        // End the voice connection, which will trigger the 'error' event in `play`
        this.voiceConnection.dispatcher?.end();

        if (this.queue.length === 0) {
            TeacherClient.sendEmbed(textChannel, {
                message: 'There are no more songs to play.'
            });
        }
    }


    /// Moves the song along by a specified time
    async forward(textChannel, member, time) {
        if (!this.isPlaying(textChannel)) {
            return;
        }

        let timeInSeconds = this.resolveTimeQuery(textChannel, time);
    
        if (timeInSeconds === null) {
            return;
        }

        // Get the current offset in the song in seconds and add it to the existing offset
        this.currentSong.offset = Math.floor(this.currentSong.offset + this.voiceConnection.dispatcher.streamTime / 1000 + timeInSeconds);

        TeacherClient.sendEmbed(textChannel, {
            message: `Fast-forwarding song by ${timeInSeconds} seconds...`,
        });

        this.play(textChannel, member);
    }

    /// Moves the song back by a specified time
    async rewind(textChannel, member, time) {
        if (!this.isPlaying(textChannel)) {
            return;
        }

        let timeInSeconds = this.resolveTimeQuery(textChannel, time);
    
        if (timeInSeconds === null) {
            return;
        }

        // Get the current offset in the song in seconds and add it to the existing offset
        this.currentSong.offset = Math.max(
            0, // The offset must not fall below 0
            Math.floor(this.currentSong.offset + this.voiceConnection.dispatcher.streamTime / 1000 - timeInSeconds),
        );

        if (this.currentSong.offset === 0) {
            TeacherClient.sendEmbed(textChannel, {
                message: 'Rewinding to the beginning...',
            });
        } else {
            TeacherClient.sendEmbed(textChannel, {
                message: `Rewinding song by ${timeInSeconds} second/s...`,
            });
        }

        this.play(textChannel, member);
    }

    async setVolume(textChannel, volume) {
        if (!this.isPlaying(textChannel)) {
            return;
        }

        if (isNaN(volume)) {
            TeacherClient.sendWarning(textChannel, {
                message: 'Volume must be an integer.',
            });
            return;
        }

        if (volume < 0) {
            TeacherClient.sendWarning(textChannel, {
                message: 'Negative volumes are not supported.',
            });
            return;
        }

        if (volume > config.default.maximumVolume) {
            TeacherClient.sendWarning(textChannel, {
                message: `${config.default.maximumVolume}% is the maximum volume.`,
            });
            return;
        }

        let volumePerUnum = volume / 100;

        this.voiceConnection.dispatcher.setVolume(volumePerUnum);

        TeacherClient.sendEmbed(textChannel, {
            message: `Set volume to ${volume}%.`,
        });
    }


    /// Displays the current as well as upcoming songs
    async displayQueue(textChannel) {
        let informationalFields = [
            {
                name: 'Currently Playing',
                value: this.currentSong?.title || 'Nothing',
            },
        ];

        // Push 'up next' section if the queue is not empty
        if (this.queue.length !== 0) {
            informationalFields.push({
                name: 'Up Next',
                value: Array.from(
                    // Show at most `maximumSearchResults` songs
                    Array(Math.min(config.default.maximumSearchResults, this.queue.length)), 
                    (_, i) => `${i + 1} ~ ${this.queue[i].title}`
                ).join('\n'),
            });
        }

        TeacherClient.sendEmbed(textChannel, {
            fields: informationalFields,
        });
    }

    async addToQueue(textChannel, song) {
        // Do not add if there already are enough songs in the queue
        if (this.queue.length >= config.default.maximumSongsInQueue) {
            TeacherClient.sendWarning(textChannel, {
                message: `There are ${this.queue.length} songs queued up already. Please wait until the next song plays.`,
            });
            return;
        }

        // Add the song to the queue
        this.queue.push(song);

        TeacherClient.sendEmbed(textChannel, {
            message: `Added '${song.title}' to the queue. [#${this.queue.length}]`,
        });
    }

    async removeFromQueue(textChannel, identifier) {
        if (this.queue.length === 0) {
            TeacherClient.sendWarning(textChannel, {
                message: `There are no songs in the queue.`,
            });
            return;
        }

        let song;

        if (!isNaN(identifier)) {
            if (!this.validateIndex(textChannel, identifier, this.queue)) {
                return;
            }

            song = this.queue.splice(identifier - 1, 1)[0];
        } else {
            let index = this.queue.find(
                (song) => song.title.toLowerCase().includes(identifier) || song.title.split(' ').some(
                    (term) => areSimilar(term, identifier)
                )
            );

            if (index === undefined) {
                TeacherClient.sendEmbed(textChannel, {
                    message: 'Could not find a song with a title that matches the search terms provided.'
                });
                return;
            }

            song = this.queue.splice(index - 1, 1)[0];
        }

        TeacherClient.sendEmbed(textChannel, {
            message: `Removed '${song.title}' from queue.`,
        });
    }


    async joinVoiceChannel(member) {
        // Set teacher's voice channel to the first user requesting to play music
        this.voiceChannel = member.voice.channel;
        // Join the voice channel the user is in
        this.voiceConnection = await this.voiceChannel.join();
        // Deafen teacher as there doesn't need to be extra traffic flowing through
        await this.voiceConnection?.voice?.setSelfDeaf(true);
    }

    
    /// Takes a string and returns the specified time in seconds
    resolveTimeQuery(textChannel, timeToResolve) {
        let totalSeconds = 0;

        // Extract the digits present in the string
        let integers = timeToResolve.match(/\d+/g);
        // Extract the strings present in the string
        let strings = timeToResolve.match(/[a-zA-Z]+/g);

        // No arguments provided for the key and/or value
        if (integers === null || strings === null) {
            TeacherClient.sendWarning(textChannel, {
                message: 'You have not provided a valid time specifier, as one of the required terms is missing',
            });
            return null;
        }

        // There aren't as many keys as there are values
        if (integers.length !== strings.length) {
            TeacherClient.sendWarning(textChannel, {
                message: 'The number of keys and values does not match.',
            });
            return null;
        }

        for (let i = 0; i < integers.length; i++) {
            // Convert string containing an integer to an integer
            integers[i] = parseInt(integers[i]);

            switch (strings[i]) {
                case 's':
                    totalSeconds += integers[i];
                    continue;
                case 'm':
                    totalSeconds += integers[i] * 60;
                    continue;
                case 'h':
                    totalSeconds += integers[i] * 60 * 60;
                    continue;
                default:
                    TeacherClient.sendWarning(textChannel, {
                        message: `'${strings[i]}' is not a valid key.`,
                    });
                    return null;
            }
        }

        return totalSeconds;
    }

    isInVoiceChannel(textChannel, voiceChannel) {
        if (!voiceChannel) {
            TeacherClient.sendWarning(textChannel, {
                message: 'To use the music module you must first join a voice channel.',
            });
            return false;
        }

        return true;
    }

    isPlaying(textChannel) {
        if (this.currentSong === null) {
            TeacherClient.sendWarning(textChannel, {
                message: 'There is no song playing.'
            });
            return false;
        }

        return true;
    }

    validateIndex(textChannel, index, array) {
        // If no message has been written
        if (index === undefined) {
            TeacherClient.sendWarning(textChannel, {
                message: 'You did not write an index.',
            });
            return false;
        }

        // If the index is not a number
        if (isNaN(index)) {
            TeacherClient.sendWarning(textChannel, {
                message: 'Not a valid index.',
            });
            return false;
        }

        // If the index is out of range
        if (index <= 0 || index > array.length) {
            TeacherClient.sendWarning(textChannel, {
                message: 'Index is out of range.',
            });
            return false;
        }

        return true;
    }
}