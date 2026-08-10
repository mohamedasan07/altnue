/**
 * Health payload — liveness probe. Returns exactly `{ status: 'ok' }` when the
 * process is up and accepting requests. Deep dependency checks live in the
 * connection service (logged at boot, non-fatal).
 */
export function getHealth() {
  return { status: 'ok' };
}