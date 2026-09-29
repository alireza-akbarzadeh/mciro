// Calling another service. Every call has a timeout, and every failure (network,
// timeout, non-2xx, invalid JSON) becomes ONE error type, so a service can
// decide in one place how to degrade when a dependency is down.

export class UpstreamUnavailableError extends Error {
  override name = 'UpstreamUnavailableError';
}

export type FetchJsonOptions = {
  /** Default 2 s. A slow dependency must not make every request slow. */
  timeoutMs?: number;
  /** Extra request headers, e.g. forwarding the browser's cookie to the Auth API. */
  headers?: Record<string, string>;
};

/** GETs JSON from another service. Throws UpstreamUnavailableError on any failure. */
export async function fetchJson(
  url: string,
  { timeoutMs = 2_000, headers = {} }: FetchJsonOptions = {},
): Promise<unknown> {
  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json', ...headers },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    throw new UpstreamUnavailableError(`${url} unavailable`, { cause: error });
  }
}
