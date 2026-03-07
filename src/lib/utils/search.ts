/**
 * Issue #9: Escape SQL LIKE/ILIKE special characters to prevent wildcard injection.
 */
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}
