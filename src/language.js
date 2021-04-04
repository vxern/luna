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

    // How many iterations there should be, based on the lesser of the lengths
    let iterations = Math.trunc(Math.min(subject.length, object.length) / 2);
    let passes = 0;

    for (let i = 0; i < iterations; i++) {
        if (distance(
                subject.substring(i * 2, i * 2 + 2), 
                object.substring(i * 2, i * 2 + 2)
            ) <= 1) {
            passes += 1;
        }
    }

    let similarity = passes / iterations;

    return similarity > (0.5 + Math.pow(0.5, iterations / passes));
}

/// Join array so that it is orthographically correct
///
/// ['A'] -> 'A'
/// ['A', 'B'] -> 'A' and 'B'
/// ['A', 'B', 'C'] -> 'A', 'B' and 'C'
export function joinArrayCoherently(target) {
    let lastElement = target.pop();
    return `${target.join(', ') + (target > 0 ? 'and' : '')} ${lastElement}`;
}

/// Removes characters that aren't ASCII digits and/or letters
export function removeNonAlphanumeric(target) {
    return target.replace(/\W/g, '');
}