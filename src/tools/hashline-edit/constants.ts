/**
 * Nibble encoding alphabet – 16 uppercase letters, no digits, no vowels.
 * Each byte maps to exactly two characters (high nibble + low nibble).
 */
export const NIBBLE_STR = 'ZPMQVRWSNKTXJBYH';

/** Pre-computed 256-entry lookup: byte value → 2-char hash fragment. */
export const HASHLINE_DICT: string[] = (() => {
  const dict: string[] = new Array(256);
  for (let i = 0; i < 256; i++) {
    dict[i] = NIBBLE_STR[(i >> 4) & 0xf] + NIBBLE_STR[i & 0xf];
  }
  return dict;
})();

/** Matches a standalone LINE#HASH reference (e.g. "42#VK"). */
export const HASHLINE_REF_PATTERN = /^([0-9]+)#([ZPMQVRWSNKTXJBYH]{2})$/;

/** Matches a hashline-prefixed output line (e.g. "42#VK|content"). */
export const HASHLINE_OUTPUT_PATTERN =
  /^([0-9]+)#([ZPMQVRWSNKTXJBYH]{2})\|(.*)$/;
