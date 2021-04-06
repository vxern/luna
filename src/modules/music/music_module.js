import 'ytdl-core';
import { YTSearcher } from 'ytsearcher';
import { TeacherClient } from '../../teacher/teacher.js';
import { TeacherModule } from "../module.js";

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
                'play': {
                    '': async () => await this.play(message.channel),
                    '$songName': async (songName) => await this.play(message.channel, songName),
                },
                'pause': async () => await this.pause(message.channel),
                'stop': async () => await this.stop(message.channel),

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

    async play(textChannel, songName) {
        if (songName === undefined) {
            TeacherClient.sendWarning(textChannel, {
                message: 'You have not specified a song name'
            });
            return false;
        }

        if (songName.length <= 3) {
            TeacherClient.sendTip(textChannel, {
                message: `The song name you've specified is very short; it may be difficult to narrow down the requested song.\n\n` +
                         'Try writing a longer name.',
            });
        }

        TeacherClient.sendEmbed(textChannel, {message: `Playing ${songName}...`});
    }

    async pause(textChannel) {
        TeacherClient.sendEmbed(textChannel, {message: 'Pausing...'});
    }

    async stop(textChannel) {
        TeacherClient.sendEmbed(textChannel, {message: 'Stopping...'});
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

    async removeFromQueue(textChannel, identifier) {
        TeacherClient.sendEmbed(textChannel, {message: `Removing ${identifier} from queue...`});
    }

    /// Check if the user is in 
    isInVoiceChannel(textChannel, voiceChannel) {
        if (voiceChannel) {
            return true;
        }

        TeacherClient.sendWarning(textChannel, {
            message: 'To play music, you must first join a voice channel',
        });
        return false;
    }
}

/*

// Begins playing a song by adding it to queue ( and playing it )
async function initialisePlaying(voice_channel, text_channel, song_name) {
    if (!checkVoiceChannel(voice_channel, text_channel)) {
        return;
    }

    if (await addToQueue(text_channel, song_name)) {
        return;
    }
    
    // If the queue isn't empty, do not play, it will play itself soon enough
    if (song_queue.length == 1) {
        try {
            // If already in voice channel, do not join.
            if (!voice_connection_channel) {
                voice_connection_channel = await voice_channel.join();
            }
            playSong(text_channel, voice_connection_channel);
        } catch (error) {
            text_channel.send({
                embed: {
                    color: color,
                    description: `An error has occurred while attempting to play: '${error}'`
                }
            });
        }
    }
}

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