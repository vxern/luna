var words_already_written = [];
var contribute_message;
var timer;
var already_notified = false;

// Time it takes for an erroneous message to be deleted
const user_error_timeout = 2000;
// Time it takes for a conversational message to be deleted
const user_message_timeout = 10000;
// Time it takes for the bot's message to be deleted
const bot_message_timeout = 5000;
// Time it takes for the bot to be able to notify the user again
const notification_timeout = 20000;

const color = 0x9580ff;

async function beginHandlingChain(channel) {
    // Fetch all the messages inside the channel
    channel.messages.fetch({ limit: 500 }).then(
        async messages => {
            for (const message of messages.array()) {
                // Split the message into arguments
                let arguments = message.content.toLowerCase().split(' ');

                // If the message has less than three arguments
                if (arguments.length < 3) {
                    message.delete();
                    continue;
                }

                // If the first argument:
                // - doesn't contain a hashtag
                // - isn't a number
                if (arguments[0][0] != '#' || isNaN(arguments[0].substring(1))) {
                    message.delete();
                    continue;
                }

                // Obtain the entirety of the 'word', for example 'a turna'
                let word = '';
                arguments.shift(); // Remove the index
                for (let i = 0; i < arguments.length; i++) {
                    if (!arguments[i].includes('(') && !arguments[i].includes('{') && !arguments[i].includes('[')) {
                        // Add argument to word
                        word = word + ' ' + arguments[i];
                    } else {
                        break;
                    }
                }

                // Add to words that have already been written
                words_already_written.push(word);
            }
        }
    ).then(
        async () => {
            await writeContributionMessage(channel);
            channel.send(words_already_written.join(', '));
        }
    );
}

function handleChain(channel, message) {
    // Split the message into arguments
    let arguments = message.content.toLowerCase().split(' ');
    
    let index = arguments[0];
    
    // If the first argument doesn't contain a hashtag or isn't a number
    if (index[0] != '#' || isNaN(index.substring(1))) {
        if (!already_notified) {
            already_notified = true;
            channel.send({
                embed: {
                    color: color,
                    description: 'Messages without a hashtag and number are automatically deleted after 10 seconds.'
                }
            }).then(
                (bot_message) => {
                    bot_message.delete({ timeout: bot_message_timeout });
                    setTimeout(() => {
                        already_notified = false;
                    }, notification_timeout);
                }
            );
        }
        message.delete({ timeout: user_message_timeout });
        return;
    }

    // If the message has less than three arguments
    if (arguments.length < 3) {
        channel.send({
            embed: {
                color: color,
                description: 'Your entry should be in this format: #[index] [word] ([definition])'
            }
        }).then(
            (bot_message) => {
                message.delete({ timeout: user_error_timeout });
                bot_message.delete({ timeout: bot_message_timeout });
            }
        );
        return;
    }

    // Obtain the entirety of the 'word', for example 'a turna'
    let word = '';
    arguments.shift(); // Remove the index
    for (let i = 0; i < arguments.length; i++) {
        if (!arguments[i].includes('(') && !arguments[i].includes('{') && !arguments[i].includes('[')) {
            // Add argument to word
            word = word + ' ' + arguments[i];
        } else {
            break;
        }
    }
    
    // If the word has been already written
    if (words_already_written.includes(word)) {
        channel.send({
            embed: {
                color: color,
                description: 'Uh-oh! Someone has already thought of this word!'
            }
        }).then(
            (bot_message) => {
                message.delete({ timeout: user_error_timeout });
                bot_message.delete({ timeout: bot_message_timeout });
            }
        );
        return;
    }

    if (contribute_message != null) {
        contribute_message.delete();
    }

    if (timer != null) {
        clearTimeout(timer);
    }

    // Write a contribution message 30 seconds after the final message
    timer = setTimeout(async () => writeContributionMessage(channel), 30000);
}

async function writeContributionMessage(channel) {
    contribute_message = await channel.send({
        embed: {
            color: color,
            description: 'Contribute by writing a word that starts with the final letter[s] of the previous one and its index.'
        }
    });
}

module.exports = { beginHandlingChain, handleChain }