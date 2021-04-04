/// Join array so that it is orthographically correct
///
/// ['A'] -> 'A'
/// ['A', 'B'] -> 'A' and 'B'
/// ['A', 'B', 'C'] -> 'A', 'B' and 'C'
export function joinArrayCoherently(target) {
    let lastElement = target.pop();
    return `${target.join(', ') + (target > 0 ? 'and' : '')} ${lastElement}`;
}

/// Generates a random number between 0, inclusive and `max`, inclusive
export function random(max) {
    return Math.floor(Math.random() * max);
}