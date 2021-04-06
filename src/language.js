import { distance } from 'fastest-levenshtein';

/// Capitalises each word in a string
export function capitaliseWords(target) {
    return target.split(' ')
        .map((word) => word[0].toUpperCase() + word.substring(1))
        .join(' ');
}

/// Checks two terms for similarity
export function areSimilar(subject, object) {
    if (subject === object) {
        return true;
    }

    if (subject === undefined || object === undefined) {
        return false;
    }

    function regularize(target) {
        return target.split('').sort().join().trim();
    }

    // If the words contain the same letters
    if (regularize(subject) === regularize(object)) {
        return true;
    }

    return distance(subject, object) < 2;
}

/// Join array so that it is orthographically correct
///
/// ['A'] -> 'A'
/// ['A', 'B'] -> 'A' and 'B'
/// ['A', 'B', 'C'] -> 'A', 'B' and 'C'
export function joinArrayCoherently(target) {
    let lastElement = target.pop();
    return `${target.join(', ')} ${target.length > 0 ? 'or' : ''} ${lastElement}`;
}

/// Removes characters that aren't ASCII digits and/or letters
export function removeNonAlphanumeric(target) {
    return target.replace(/\W/g, '');
}