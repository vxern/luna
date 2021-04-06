/// Generates a random number between 0, inclusive and `max`, inclusive
export function random(max) {
    return Math.floor(Math.random() * max);
}

/// Removes undesired elements from an object
export function filterObject(target, predicate) {
    for (let key of Object.keys(target)) {
        // If the element does not fit the predicate, remove it
        if (!predicate(key)) {
            delete target[key];
        }
    }
    return target;
}