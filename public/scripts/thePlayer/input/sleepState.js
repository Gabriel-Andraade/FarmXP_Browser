/**
 * @file sleepState.js - Is the player asleep? (#264)
 *
 * One flag, on its own, because two halves of the input layer need it and
 * neither should have to import the other: the keyboard and mouse handlers in
 * control.js swallow everything while it is true, and the touch layer in
 * touch.js stops walking the player.
 *
 * It was a module-level `let` inside control.js. Moving the touch layer out
 * would have meant control.js importing touch.js and touch.js importing
 * control.js back, for one boolean.
 */

let sleeping = false;

export function isSleeping() {
    return sleeping;
}

export function setSleeping(value) {
    sleeping = !!value;
}

export default { isSleeping, setSleeping };
