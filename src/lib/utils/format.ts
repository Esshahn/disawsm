/**
 * Shared formatting utilities
 */

/**
 * Converts a number to a hex string with specified digits
 * @param num - The number to convert
 * @param digits - Number of hex digits (2 for byte, 4 for word)
 * @returns Lowercase hex string with leading zeros
 */
export function toHex(num: number, digits: number): string {
  return num.toString(16).padStart(digits, '0').toLowerCase();
}
