import { logger } from './logger.js';

/**
 * Safely dispatches a CustomEvent, catching any errors thrown by listeners.
 * Prevents listener bugs from crashing the dispatching code.
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
