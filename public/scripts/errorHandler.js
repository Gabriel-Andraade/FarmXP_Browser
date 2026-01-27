const seen = new Set();

/**
 * checks if debug mode is enabled.
 * priority order:
 * - url query ?debug=1
 * - global flags (DEBUG_MODE / __DEBUG__)
 * - localhost hostname
 */
function isDebugEnabled() {
  try {
    const url = new URL(globalThis.location?.href ?? "http://localhost/");
    if (url.searchParams.get("debug") === "1") return true;
  } catch (err) {
    if (globalThis.location?.hostname === "localhost") {
      console.warn("[errorHandler:isDebugEnabled] falha ao ler location.href", err);
    }
  }

  return Boolean(
    globalThis.DEBUG_MODE ||
      globalThis.__DEBUG__ ||
      globalThis.location?.hostname === "localhost"
  );
}

/**
 * normalizes extra data to be logged.
 */
function toPayload(extra) {
  if (extra === undefined) return undefined;
  if (extra && typeof extra === "object") return extra;
  return { extra };
}

/**
 * logs a warning when debug is enabled.
 */
export function handleWarn(message, context = "unknown", extra) {
  if (!isDebugEnabled()) return;
  if (extra !== undefined) console.warn(`[${context}] ${message}`, toPayload(extra));
  else console.warn(`[${context}] ${message}`);
}

/**
 * logs an error when debug is enabled.
 */
export function handleError(error, context = "unknown", message) {
  if (!isDebugEnabled()) return;

  if (message) console.error(`[${context}] ${message}`, error);
  else console.error(`[${context}]`, error);

  if (error?.stack) console.error(error.stack);
}

/**
 * logs an error only once per unique context/message/error signature.
 */
export function handleErrorOnce(error, context = "unknown", message) {
  const key = `${context}:${message ?? ""}:${error?.message ?? String(error)}`;
  if (seen.has(key)) return;
  seen.add(key);
  handleError(error, context, message);
}
