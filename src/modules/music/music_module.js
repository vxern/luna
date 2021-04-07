import 'ytdl-core';
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
        this.songQueue = [];
        this.voiceConnection = undefined;
    }

    async handleMessage(message) {
        return await super.resolveCommand(message.content, {
            precheck: () => this.isInVoiceChannel(message.channel, message.member.voice.channel),
            commands: {
                // Search for a song and play it
                'play': {
                    '': async () => await this.play(message.channel, message.author, 
                            await this.searchSong(message.channel, message.author, '')
                        ),
                    '$songName': async (songName) => await this.play(message.channel, message.author, 
                            await this.searchSong(message.channel, message.author, songName)
                        ),
                },
                // Pause the current song
                'pause': async () => await this.pause(message.channel),

                'skip': {
                    // Skip entire song
                    '': async () => await this.skipSong(message.channel),
                    // Skip a specified time
                    '$time': async (time) => await this.skipTime(message.channel, time),
                },

                'queue': {
                    '': async () => await this.displayQueue(message.channel),
                    'remove': {
                        // Remove last song from queue
                        '': async () => await this.removeFromQueue(message.channel, Math.max(0, this.songQueue.length - 1)),
                        // Remove song specified by user
                        '$identifier': async (identifier) => await this.removeFromQueue(message.channel, identifier),
                    }
                },
            }
        });
    }

    async play(textChannel, user, searchResult) {
        // `searchSong` yielded `null`, song hasn't been found
        if (searchResult === null) {
            return true;
        }

        let songToPlay;

        console.log(searchResult);
    }

    async pause(textChannel) {
        TeacherClient.sendEmbed(textChannel, {message: 'Pausing...'});
    }

    async skipSong(textChannel) {
        TeacherClient.sendEmbed(textChannel, {message: 'Skipping song...'});
    }

    async skipTime(textChannel, time) {
        TeacherClient.sendEmbed(textChannel, {message: `Skipping ${time}...`});
    }

    async displayQueue(textChannel) {
        TeacherClient.sendEmbed(textChannel, {message: 'Displaying queue...'});
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
            TeacherClient.sendTip(textChannel, {
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
            TeacherClient.sendEmbed(textChannel, {
                message: 'You did not write an index',
            });
            return null;
        }

        // If the index is not a number
        if (isNaN(index)) {
            TeacherClient.sendEmbed(textChannel, {
                message: 'Not a valid index',
            });
            return null;
        }

        // If the index is out of range
        if (index <= 0 || index > searchResults.length) {
            TeacherClient.sendEmbed(textChannel, {
                message: 'Index is out of range',
            });
            return null;
        }

        return searchResults[index - 1];
    }

    async removeFromQueue(textChannel, identifier) {
        TeacherClient.sendEmbed(textChannel, {message: `Removing ${identifier} from queue...`});
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
// Adds a song to the queue after resolving
async function addToQueue(text_channel, url) {
    if (url === '') {
        text_channel.send({
            embed: {
                color: color,
                description: `You must specify the name of a song.`
            }
        });
        return;
    }

    // For checking whether the link is a url or not
    let check_url = url.toLowerCase();

    // If the message is a link
    if (!(check_url.includes('https://') ||
        check_url.includes('youtube'))) {
        let results = await url_searcher.search(url);
        url = results.first.url;
    }

    // Fetch the necessary data
    let song_player = ytdl(url, {filter: 'audioonly'});
    let title = (await ytdl.getInfo(url)).videoDetails.title;

    // If the same song exists already
    if (song_queue.some((song) => song.title == title)) {
        text_channel.send({
            embed: {
                color: color,
                description: `**${title}** is already in the queue.`
            }
        });
        return;
    }

    song_queue.push({
        title: title,
        song_player: song_player
    });

    text_channel.send({
        embed: {
            color: 0x00dd00,
            description: `**${title}** added to queue [#${song_queue.length}]`
        }
    });
}

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