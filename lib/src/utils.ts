/**
 * @module utils
 * Lightweight helpers for reading and writing deeply-nested object paths.
 */

/**
 * Reads the value at a dot-notation `path` inside `obj`.
 * Returns `undefined` when any segment along the path is nullish.
 *
 * @example
 * ```ts
 * getPath({ a: { b: { c: 42 } } }, 'a.b.c'); // 42
 * getPath({ a: null }, 'a.b');                 // undefined
 * ```
 */
export function getPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

/**
 * Returns a shallow-cloned copy of `obj` with the value at `path` set to
 * `value`.  Intermediate objects are shallow-cloned so the original is
 * never mutated.
 *
 * @example
 * ```ts
 * const next = setPath({ a: { b: 1 } }, 'a.b', 42);
 * // next === { a: { b: 42 } }   (original unchanged)
 * ```
 */
export function setPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const keys = path.split('.');
  const clone = { ...obj };
  let cursor: Record<string, unknown> = clone;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i] as string;
    const child = cursor[key];
    const childClone: Record<string, unknown> =
      child !== null && typeof child === 'object' ? { ...(child as Record<string, unknown>) } : {};
    cursor[key] = childClone;
    cursor = childClone;
  }

  const lastKey = keys[keys.length - 1] as string;
  cursor[lastKey] = value;
  return clone;
}
