import ytdl from 'ytdl-core';
import { YTSearcher } from 'ytsearcher';

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

        this.volume = 100;

        this.isPlaying = true;
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
                'pause': async () => await this.pause(message.channel),
                'skip': async () => await this.skip(message.channel),
                
                'forward': {
                    '$time': async (time) => await this.forward(message.channel, message.member,
                        this.resolveTimeQuery(message.channel, time),
                    ),
                },
                'rewind': {
                    '$time': async (time) => await this.rewind(message.channel, message.member,
                        this.resolveTimeQuery(message.channel, time),
                    ),
                },

                'queue': {
                    '': async () => await this.displayQueue(message.channel),
                    'remove': {
                        '': async () => await this.removeFromQueue(message.channel, Math.max(0, this.queue.length - 1)),
                        '$identifier': async (identifier) => await this.removeFromQueue(message.channel, identifier),
                    }
                },
            }
        });
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

        if (playNext) {
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
            { seek: this.currentSong.offset },
        ).on('finish', async () => {
            this.play(textChannel, member, {playNext: true});
        }).on('error', async () => {
            TeacherClient.sendError(textChannel, {
                message: `Could not stream song '${this.currentSong.title}'`
            });
            
            this.play(textChannel, member, {playNext: true});
        });

        return true;
    }

    /// Searches for a song, asks the user to pick the song and returns `YTSearch` or `undefined`
    async searchSong(textChannel, user, songName) {
        if (songName === undefined) {
            TeacherClient.sendWarning(textChannel, {
                message: 'You have not specified a song name'
            });
            return null;
        }

        if (songName.length <= 3) {
            TeacherClient.sendTip(textChannel, {
                message: `The song name you've specified is very short. It may be difficult to find the requested song`,
            });
        }

        if (songName.length > 40) {
            TeacherClient.sendError(textChannel, {
                message: `That does not look like a song name`,
            });
            return null;
        }
        
        if (songName.startsWith('https://') || songName.startsWith('http://')) {
            TeacherClient.sendWarning(textChannel, {
                message: 'Playing from links is not supported. Please search a song by its name',
            });
            return null;
        }

        let searchResults;

        try {
            // Obtain search results
            searchResults = (await searcher.search(songName)).currentPage.slice(0, config.default.maximumSearchResults);
        } catch {
            TeacherClient.sendError(textChannel, {
                message: 'An error occurred while attempting to resolve the name of a song to its url.\n\n' +
                         'Consider renewing the YouTube token',
            });
            return null;
        }
        
        if (searchResults.length === 0) {
            TeacherClient.sendTip(textChannel, {
                message: 'No results found. Try refining your search',
            });
            return null;
        } 

        TeacherClient.sendEmbed(textChannel, {
            // Generate fields
            fields: {
                name: 'Select a song below by writing its index',
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

        // If no message has been written
        if (index === undefined) {
            TeacherClient.sendWarning(textChannel, {
                message: 'You did not write an index',
            });
            return null;
        }

        // If the index is not a number
        if (isNaN(index)) {
            TeacherClient.sendWarning(textChannel, {
                message: 'Not a valid index',
            });
            return null;
        }

        // If the index is out of range
        if (index <= 0 || index > searchResults.length) {
            TeacherClient.sendWarning(textChannel, {
                message: 'Index is out of range',
            });
            return null;
        }

        return searchResults[index - 1];
    }

    /// Pauses or resumes song
    async pause(textChannel) {
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
            message: 'Paused song',
        });
        return;
    }

    /// Skips a song and plays the first one in the queue
    async skip(textChannel) {
        if (this.currentSong === null) {
            TeacherClient.sendWarning(textChannel, {
                message: `You cannot skip a song when there is no song being played`
            });
            return;
        }

        TeacherClient.sendEmbed(textChannel, {
            message: `Skipping '${this.currentSong.title}'...`
        });

        // End the voice connection, which will trigger the 'error' event in `play`
        this.voiceConnection.dispatcher?.end();

        if (this.queue.length === 0) {
            TeacherClient.sendEmbed(textChannel, {
                message: `There are no more songs to play`
            });
        }
    }


    /// Moves the song along by a specified time
    async forward(textChannel, member, timeInSeconds) {
        if (timeInSeconds === null) {
            return;
        }

        if (this.currentSong === null) {
            TeacherClient.sendWarning(textChannel, {
                message: 'Cannot fast forward song because there is no song playing',
            });
            return;
        }

        // Get the current offset in the song in seconds and add it to the existing offset
        this.currentSong.offset = Math.floor(this.currentSong.offset + this.voiceConnection.dispatcher.streamTime / 1000 + timeInSeconds);

        TeacherClient.sendEmbed(textChannel, {
            message: `Fast forwarding song by ${timeInSeconds} seconds`,
        });

        this.play(textChannel, member);
    }

    /// Moves the song back by a specified time
    async rewind(textChannel, member, timeInSeconds) {
        if (timeInSeconds === null) {
            return;
        }

        if (this.currentSong === null) {
            TeacherClient.sendWarning(textChannel, {
                message: 'Cannot rewind song because there is no song playing',
            });
            return;
        }

        // Get the current offset in the song in seconds and add it to the existing offset
        this.currentSong.offset = Math.max(
            0, // The offset must not fall below 0
            Math.floor(this.currentSong.offset + this.voiceConnection.dispatcher.streamTime / 1000 - timeInSeconds),
        );

        if (this.currentSong.offset === 0) {
            TeacherClient.sendEmbed(textChannel, {
                message: 'Rewinding song to the beginning',
            });
        } else {
            TeacherClient.sendEmbed(textChannel, {
                message: `Rewinding song by ${timeInSeconds} second/s`,
            });
        }

        this.play(textChannel, member);
    }


    /// Displays the upcoming songs
    async displayQueue(textChannel) {
        TeacherClient.sendEmbed(textChannel, {message: 'Displaying queue...'});
    }

    async addToQueue(textChannel, song) {
        // Do not add if there already are enough songs in the queue
        if (this.queue.length >= config.default.maximumSongsInQueue) {
            TeacherClient.sendWarning(textChannel, {
                message: `There are ${this.queue.length} songs queued up already. Please wait until the next song plays`,
            });
            return;
        }

        this.queue.push(song);
        TeacherClient.sendEmbed(textChannel, {
            message: `Added '${song.title}' to the queue [#${this.queue.length}]`,
        });
    }

    async removeFromQueue(textChannel, identifier) {
        TeacherClient.sendEmbed(textChannel, {message: `Removing ${identifier} from queue...`});
    }

    async joinVoiceChannel(member) {
        // Set teacher's voice channel to the first user requesting to play music
        this.voiceChannel = member.voice.channel;
        // Join the voice channel the user is in
        this.voiceConnection = await this.voiceChannel.join();
        // Deafen teacher as there doesn't need to be extra traffic flowing through
        await this.voiceConnection.voice.setSelfDeaf(true);
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
                        message: `'${strings[i]}' is not a valid key`,
                    });
                    return;
            }
        }

        return totalSeconds;
    }

    /// Check if the user is in 
    isInVoiceChannel(textChannel, voiceChannel) {
        if (voiceChannel) {
            return true;
        }

        TeacherClient.sendWarning(textChannel, {
            message: 'To play music you must first join a voice channel',
        });
        return false;
    }
}

/*
// Plays a song by accessing the queue
async function playSong(text_channel, connection) {
    if (song_queue.length === 0) {
        return;
    }

    let current_song = song_queue[0];
    
    // Begin playing in channel
    voice_connection = connection.play(current_song.song_player);
    voice_connection.on('finish', () => {
            // Remove the song that was just played
            song_queue.shift();
            // Proceed to next song
            playSong(text_channel, connection);
        });
    voice_connection.on('error', error => {
        if (error == 'Error: Video unavailable') {
            text_channel.send({
                embed: {
                    color: color,
                    description: `Song unavailable, skipping...`
                }
            });
            // Remove the song that was just played
            song_queue.shift();
            // Proceed to next song
            playSong(text_channel, connection);
        }
    });
    voice_connection.setVolumeLogarithmic(1);
    text_channel.send({
        embed: {
            color: color,
            description: `Now playing **${current_song.title}** [#${song_queue.length}]`
        }
    });

}

// Skips a song by ending the current one
async function skipSong(voice_channel, text_channel) {
    if (!checkVoiceChannel(voice_channel, text_channel)) {
        return;
    }

    // Ends playing which triggers 'finish' which we're awaiting in 'play_song'
    voice_connection.end();

    text_channel.send({
        embed: {
            color: color,
            description: `Skipping **${song_queue[0].title}** [#${song_queue.length}]`
        }
    });
}

// Pauses a song
async function pauseSong(voice_channel, text_channel) {
    if (!checkVoiceChannel(voice_channel, text_channel)) {
        return;
    }

    if (voice_connection.paused) {
        voice_connection.resume();
        text_channel.send({
            embed: {
                color: color,
                description: 'Song resumed.'
            }
        });
    } else {
        voice_connection.pause();
        text_channel.send({
            embed: {
                color: color,
                description: 'Song paused.'
            }
        });
    }
}

// Clears song queue and leaves
async function stopPlaying(voice_channel, text_channel) {
    if (!checkVoiceChannel(voice_channel, text_channel)) {
        return;
    }

    // Resets queue and stops playing
    song_queue = [];
    voice_connection.end();
    voice_connection_channel = null;
    // Leaves channel
    voice_channel.leave();

    text_channel.send({
        embed: {
            color: color,
            description: `Goodbye!`
        }
    });
}

// Displays the queue
async function displayQueue(voice_channel, text_channel) {
    if (!checkVoiceChannel(voice_channel, text_channel)) {
        return;
    }

    let titles = song_queue.map((song) => song.title);
    titles.shift();

    text_channel.send({
        embed: {
            color: color,
            fields: [
                (
                    titles.length == 0 ?
                    {
                        name: 'No upcoming songs',
                        value: 'The queue is empty'
                    } :
                    {
                        name: 'Upcoming songs...',
                        value: `${titles.join(`\n`)}`
                    }
                )
            ]
        }
    });
}

// Start playing the current song again
async function replaySong(voice_channel, text_channel) {
    if (!checkVoiceChannel(voice_channel, text_channel)) {
        return;
    }

    if (song_queue.length == 0) {
        text_channel.send({
            embed: {
                color: color,
                description: 'There is no song to replay.'
            }
        });
        return;
    }
    // Readd the current song
    song_queue.unshift(song_queue[0]);
    playSong(text_channel, voice_connection);
    text_channel.send({
        embed: {
            color: color,
            description: 'Replaying current song!'
        }
    });
}
    
// Removes song at specified index
async function removeSong(voice_channel, text_channel, index_to_remove) {
    if (!checkVoiceChannel(voice_channel, text_channel)) {
        return;
    }

    // If the index is not a number
    if (isNaN(index_to_remove)) {
        text_channel.send({
            embed: {
                color: color,
                description: 'Your index must be a number.'
            }
        });
    // If index outside of bounds
    } else if (index_to_remove > song_queue.length || index_to_remove < 2) {
        text_channel.send({
            embed: {
                color: color,
                description: 'Your index is either too high or too low. Please check the index of the song requested.'
            }
        });
    } else {
        // Removes the song with the index
        song_queue.splice(index_to_remove - 1);
        text_channel.send({
            embed: {
                color: color,
                description: 'Removed song.'
            }
        });
    }
}

// Check if the user is in a voice channel
function checkVoiceChannel(voice_channel, text_channel) {
    if (!voice_channel) {
        text_channel.send({
            embed: {
                color: color,
                description: 'You must be in a voice channel in order to play music.'
            }
        });
        return false;
    }
    return true;
}

module.exports = { 
    initialisePlaying, 
    addToQueue, 
    playSong, 
    skipSong, 
    pauseSong, 
    replaySong,
    stopPlaying, 
    displayQueue, 
    removeSong,
}
*/