import { logger } from './logger.js';

/**
 * Wraps dispatchEvent in a try-catch to guard against errors thrown
 * by the dispatch call itself (e.g., invalid event, destroyed target).
 *
 * Note: Per the DOM spec, exceptions thrown inside event listeners do NOT
 * propagate back to the dispatchEvent caller — they are reported as uncaught
 * exceptions to the global error handler (window.onerror / window.addEventListener('error')).
 * For true listener-level isolation, use try-catch inside each listener
 * or a global error handler.
 *
 * @param {EventTarget} target - The target to dispatch the event on (e.g., document)
 * @param {Event} event - The event to dispatch
 */
export function safeDispatch(target, event) {
    try {
        target.dispatchEvent(event);
    } catch (e) {
        logger.error(`[Event] Error dispatching ${event.type}:`, e);
    }
}
