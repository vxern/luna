// Libraries required for language work
const levenshtein = require('fastest-levenshtein');
const fs = require('fs');
const utils = require('../../utils.js');

var sentences;

// Loads sentences from the language file
function loadSentences() {
    sentences = fs
        .readFileSync('ro-strings.txt')
        .toString()
        .split(/\r?\n/);
}

// Capitalises each term in a string
function capitalise(subject) {
    let terms = subject.split(' ');
    
    for (let i = 0; i < terms.length; i++) {
        terms[i] = terms[i][0].toUpperCase() + terms[i].substring(1);
    }

    return terms.join(' ');
}

// Picks a random term from a random sentence
function pickTerm() {
    let sentence_index = utils.random(sentences.length);
    console.log(sentence_index);
    let sentence = sentences[sentence_index];
    console.log(sentence);
    let sentence_sanitised = removeNonAlphanumeric(sentence);

    let terms = sentence_sanitised.split(' ');
    let term_index = utils.random(terms.length);
    let term = terms[term_index];

    return {
        sentence: sentence,
        term: term
    };
}

// Picks similar terms by 1. comparing distance or 2. picking words with similar endings
function pickSimilarTerms({subject, max_terms = -1}) {
    let similar_terms = new Array();

    if (subject.length > 5) {
        let both_fit = new Array();
        let suffix_fit = new Array();
    
        let subject_prefix = subject.substring(0, 3);
        let subject_suffix = subject.substring(subject.length - 3, subject.length);

        // Iterate through every sentence
        for (let s_index = 0; s_index < sentences.length; s_index++) {
            let terms = removeNonAlphanumeric(sentences[s_index]).split(' ');
            // Iterate through every term
            for (let t_index = 0; t_index < terms.length; t_index++) {
                if (terms[t_index].length < 5 || !isNaN(terms[t_index])) {
                    continue;
                }
                // Calculate distance to term
                let distance_prefix = levenshtein.distance(subject_prefix, terms[t_index].substring(0, 3));
                let distance_suffix = levenshtein.distance(subject_suffix, terms[t_index].substring(terms[t_index].length - 3, terms[t_index].length));
                if (distance_suffix === 0) {
                    if (distance_prefix < 1) {
                        both_fit.push(terms[t_index]);
                    } else {
                        suffix_fit.push(terms[t_index]);
                    }
                }
            }
        }

        similar_terms = both_fit;
        if (similar_terms < max_terms) {
            similar_terms.concat(suffix_fit);
        }
    } else {
        // Iterate through every sentence
        for (let s_index = 0; s_index < sentences.length; s_index++) {
            let terms = removeNonAlphanumeric(sentences[s_index]).split(' ');
            // Iterate through every term
            for (let t_index = 0; t_index < terms.length; t_index++) {
                if (terms[t_index] === subject || 
                    !isNaN(terms[t_index]) ||
                    similar_terms.includes(terms[t_index])) {
                    continue;
                }
                // Calculate distance to term
                let distance = levenshtein.distance(subject, terms[t_index]);
                if (distance !== 0 && distance < 3) {
                    similar_terms.push(terms[t_index]);
                }
            }
        }
    }

    // Picks the best fits
    if (max_terms != -1) {
        if (max_terms > similar_terms.length) {
            max_terms = similar_terms.length;
        }
        let closest_terms = new Array();
        let closest_distance = 4;
        let closest_term_index;
        // While the closest terms array is not full
        while (closest_terms.length != max_terms) {
            for (let t_index = 0; t_index < similar_terms.length; t_index++) {
                // Calculate distance to term
                let distance = levenshtein.distance(subject, similar_terms[t_index]);
                if (distance <= closest_distance) {
                    closest_distance = distance;
                    closest_term_index = t_index;
                }
            }
            // Add to closest terms array
            closest_terms.push(similar_terms[closest_term_index]);
            // Remove from similar terms array
            similar_terms.splice(closest_term_index, closest_term_index);
        }
        // Set the return array to closest terms array
        similar_terms = closest_terms;
    }

    console.log(similar_terms);

    return similar_terms;
}

// Removes symbols and digits
function removeNonAlphanumeric(subject) {
    return subject
        .replace(/[^\w\săĂâÂîÎțȚșȘţŢşŞ]/g, '')
        .replace(/[0-9]/g, '');
}

// Removes Romanian unicode
function removeRomanian(subject) {
    return subject
        .replace(/[șȘşŞ]/g, 's')
        .replace(/[țȚţŢ]/g, 't')
        .replace(/[ăĂâÂ]/g, 'a')
        .replace(/[îÎ]/g, 'i');
}

module.exports = { loadSentences, capitalise, pickTerm, pickSimilarTerms, removeNonAlphanumeric, removeRomanian }