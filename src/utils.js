/// Capitalises each word in a string
export function capitaliseWords(target) {
    let terms = target.split(' ');
    
    for (let i = 0; i < terms.length; i++) {
        terms[i] = terms[i][0].toUpperCase() + terms[i].substring(1);
    }

    return terms.join(' ');
}

/// Generates a random number between 0, inclusive and `max`, inclusive
export function random(max) {
    return Math.floor(Math.random() * max);
}