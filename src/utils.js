/// Generates a random number between 0, inclusive and `max`, inclusive
export function random(max) {
    return Math.floor(Math.random() * max);
}

/// Maps over a.. map and removes the undesired elements
export function filterMap(target, predicate) {
    for (let key of target.keys()) {
        if (!predicate) {
            target.delete(key);
        }
    }
    return target;
}