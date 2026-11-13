import { getDevice } from "./constants";

/**
 * Screenshots per device, with borrowed ones filled in: a device that has
 * `fallbackFrom` and no uploads of its own (the Play feature graphic) gets the
 * first screenshot of the first listed device that has one.
 */
export function withFallbacks<T>(shots: Record<string, T[]>, deviceIds: string[]): Record<string, T[]> {
  const out = { ...shots };
  for (const id of deviceIds) {
    if (out[id]?.length) continue;
    const from = getDevice(id)?.fallbackFrom?.find((src) => shots[src]?.length);
    if (from) out[id] = [shots[from][0]];
  }
  return out;
}

/** Whether `deviceId`'s screenshots are borrowed rather than uploaded. */
export function isBorrowed<T>(shots: Record<string, T[]>, deviceId: string): boolean {
  return !shots[deviceId]?.length && Boolean(getDevice(deviceId)?.fallbackFrom?.some((src) => shots[src]?.length));
}
