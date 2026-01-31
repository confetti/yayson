/**
 * Filters an attributes object to only include keys in the fields array.
 * Returns the original attributes if fields is undefined.
 */
export function filterByFields(
  attributes: Record<string, unknown>,
  fields: string[] | undefined,
): Record<string, unknown> {
  if (!fields) {
    return attributes
  }
  const filtered: Record<string, unknown> = {}
  for (const key of fields) {
    if (key in attributes) {
      filtered[key] = attributes[key]
    }
  }
  return filtered
}
