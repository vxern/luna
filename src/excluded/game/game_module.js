const language = require('../language');
const utils = require('../../utils').default;
const levenshtein = require('fastest-levenshtein');

// <user_id, term>
const users = new Map();

// Begins the game for a user
async function beginGame(user_id, text_channel) {
    assignNewTerm(user_id, text_channel);
}

// Stops the game for a user
function endGame(user_id, text_channel) {
    users.delete(user_id);
}

// Assigns new term to user and displays choices
function assignNewTerm(user_id, text_channel) {
    let choice = fetchChoice();

    // Assigns term to user
    users.set(user_id, choice);
    // Displays the choices to user
    displayChoices(choice, text_channel);
}

// Fetches random term
function fetchChoice() {
    let term = language.pickTerm();

    // For displaying wrong choices
    let terms_to_display = language.pickSimilarTerms({subject: term.term, max_terms: 4});
    
    // Do not add existent term
    if (!terms_to_display.includes(term.term)) {
        terms_to_display[utils.random(4)] = term.term;
    }

    return {
        sentence: term.sentence,
        term: term.term, 
        terms_to_display: terms_to_display
    };
}

// Displays the choice to user
function displayChoices(choice, text_channel) {
    // Replaces the choice with 
    let sentence_abridged = choice.sentence.replace(choice.term, '\\_'.repeat(5));

    text_channel.send({
        embed: {
            fields: [
                {
                    name: 'Sentence',
                    value: sentence_abridged
                },
                {
                    name: 'Choices',
                    value: choice.terms_to_display.join('\n')
                }
            ],
            footer: {
                text: `Type 'quit' to quit.`
            }
        }
    });
}

// Array of messages that the user can use to end the game
const end_messages = ['quit', 'leave', 'end', 'finish'];
// Array of messages that the user can use to skip / reveal
const skip_messages = ['reveal', 'show', 'next'];

async function handleChoice(user_id, text_channel, message) {
    let choice = users.get(user_id);

    // If the user wants to quit
    if (end_messages.includes(message)) {
        endGame(user_id, text_channel);
        text_channel.send({
            embed: {
                color: 0x00aaaa, 
                description: `Thanks for playing, see you next time! <:flag_ro_heart:432243104855359498>`
            }
        });
        return;
    } else if (skip_messages.includes(message)) {
        text_channel.send({
            embed: {
                color: 0x00aaaa, 
                description: `The term was: '${choice.term}'`
            }
        });
        assignNewTerm(user_id, text_channel);
        return;
    }

    let distance = levenshtein.distance(language.removeRomanian(choice.term), language.removeRomanian(message));

    if (distance === 0) {
        text_channel.send({
            embed: {
                color: 0x00dd00, 
                description: `Correct! The term was '${choice.term}'`
            }
        });
    } else if (distance < 3) {
        text_channel.send({
            embed: {
                color: 0xdddd00, 
                description: `Nearly there! Try again.`,
                footer: {
                    text: `Type 'reveal' to reveal the original word.`
                }
            }
        });
        displayChoices(choice, text_channel);
        return;
    } else {
        text_channel.send({
            embed: {
                color: 0xaa0000, 
                description: `Incorrect. The term was '${choice.term}'`
            }
        });
    }

    setTimeout(() => assignNewTerm(user_id, text_channel), 400);
}

module.exports = { beginGame, handleChoice, users }