const Discord = require('discord.js');
const Client = new Discord.Client();

const authorization = require('teacher_modules/config/authorization.json');
const channels = require('teacher_modules/config/channels.json');

const game = require('teacher_modules/language_game/game');
const language = require('teacher_modules/language_game/language');

const roles = require('teacher_modules/roles/roles');

const music = require('teacher_modules/music');
const word_chain = require('teacher_modules/word-chain')

const word_chain_channel_id = '786257105563811841';

// Load sentences before logging in
language.loadSentences();

Client.login(authorization.auth_key);

Client.on('ready', () => {
    Client.user.setActivity('Moara Cuvintelor');

    let word_chain_channel = Client.channels.cache.find(channel => channel.id === word_chain_channel_id);
    // Collect words that have been written into #word-chain
    word_chain.beginHandlingChain(word_chain_channel);

    console.log('Ready!');
});

Client.on('error', e => {console.error(e)});

Client.on('message', async(message) => {
    // If the user is a bot
    if (message.author.bot) {
        return;
    }
    // If the message is outside the allowed channels
    if (!channels.includes(message.channel.id)) {
        return;
    }
    // Prevents the bot from responding to its own messages
    if (message.member.id === Client.user.id) {
        return;
    }

    // Make message lowercase
    message.content = message.content.toLowerCase();
    // Extract arguments
    let arguments = message.content.split(' ');
    // Remove all empty entries
    arguments = arguments.filter(
        (value) => {
            return (value !== null && value !== '')
        });
    let command = arguments[0];

    // If the user instantiated a game, redirect to game
    if (game.users.has(message.member.id)) {
        game.handleChoice(message.member.id, message.channel, message.content);
        return;
    }

    // If the message is found in the word chain channel, redirect to word_chain
    if (message.channel.id === word_chain_channel_id) {
        word_chain.handleChain(message.channel, message);
        return;
    }
    
    switch (command) {
        // Role related
        case 'roles':
            roles.displayAvailableRoles(message.member, message.channel);
            return;

        // Info related
        case 'commands':
        case 'help':
            displayAvailableCommands(message.channel);
            return;
        case 'info':
            displayInfo(message.channel, message.guild);
            return;

        // Minigame related
        case 'learn':
            text_channel.send({
                embed: {
                    color: 0xfaa61a, 
                    description: "This command is not yet available. This may be due to testing or other reasons."
                }
            });
            //game.beginGame(message.member.id, message.channel);
            return;

        // Music related
        case 'play':
            // Removes command from arguments
            arguments.shift();
            let song_name = arguments.join(' ');
            music.initialisePlaying(message.member.voice.channel, message.channel, song_name);
            return;
        case 'skip':
            music.skipSong(message.member.voice.channel, message.channel);
            return;
        case 'pause':
            music.pauseSong(message.member.voice.channel, message.channel);
            return;
        case 'replay':
            music.replaySong(message.member.voice.channel, message.channel);
            return;
        case 'stop':
            music.stopPlaying(message.member.voice.channel, message.channel);
            return;
        case 'queue':
            music.displayQueue(message.member.voice.channel, message.channel);
            return;
        case 'remove':
            // Removes command from arguments
            arguments.shift();
            let index_to_remove = arguments.join(' ');
            music.removeSong(message.member.voice.channel, message.channel, index_to_remove);
            return;

        // Role related
        default:
            // As the arguments do not contain a command, we do not have to shift
            let target_role = arguments.join(' ');
            roles.resolveRole(message.member, message.channel, target_role);
            return;
    }
});

async function displayInfo(text_channel, guild) {
    let memberCount = guild.memberCount;
    text_channel.send({embed: {
        color: 0x4e4ecb, 
        thumbnail: {
            url: guild.iconURL()
        }, 
        title: 'Learn Romanian', 
        description: 'The biggest Discord server dedicated to the Romanian language.',
        fields: [
            {
                name: 'Members',
                value: memberCount
            },
        ]
    }});
}

async function displayAvailableCommands(text_channel) {
    text_channel.send({
        embed: {
            color: 0xfaa61a, 
            fields: [
                {
                    name: 'Help | Commands', 
                    value: 'Displays this list'
                },
                {
                    name: 'Learn', 
                    value: 'Starts a minigame in which the user chooses the correct word'
                },
                {
                    name: 'Play | Skip | Stop | Remove [id] | Queue', 
                    value: 'Plays music'
                },
                {
                    name: 'Roles', 
                    value: 'Displays list of assignable roles'
                },
                {
                    name: 'Info', 
                    value: 'Displays info about the server'
                }
            ]
        }
    });
}