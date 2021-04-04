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
            ) < 2) {
            passes += 1;
        }
    }

    let similarity = passes / iterations;

    return similarity > 0.7;
}