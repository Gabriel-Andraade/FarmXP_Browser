const seen = new Set();

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

function toPayload(extra) {
  if (extra === undefined) return undefined;
  if (extra && typeof extra === "object") return extra;
  return { extra };
}

export function handleWarn(message, context = "unknown", extra) {
  if (!isDebugEnabled()) return;
  if (extra !== undefined) console.warn(`[${context}] ${message}`, toPayload(extra));
  else console.warn(`[${context}] ${message}`);
}

export function handleError(error, context = "unknown", message) {
  if (!isDebugEnabled()) return;

  if (message) console.error(`[${context}] ${message}`, error);
  else console.error(`[${context}]`, error);

  if (error?.stack) console.error(error.stack);
}

export function handleErrorOnce(error, context = "unknown", message) {
  const key = `${context}:${message ?? ""}:${error?.message ?? String(error)}`;
  if (seen.has(key)) return;
  seen.add(key);
  handleError(error, context, message);
}
