import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Accetta solo caratteri ASCII stampabili (0x20–0x7E), newline (\n),
 * e i blocchi Unicode standard degli emoji più comuni (ZWJ incluso).
 *
 * Rifiuta lettere accentate, cirillico, CJK e altri caratteri fuori ASCII
 * che potrebbero non transitare correttamente nei gateway push.
 */
const ASCII_EMOJI_RE = new RegExp(
  '^[' +
    '\x20-\x7E' +    // ASCII stampabile
    '\n\r' +         // a capo
    '\u00A9\u00AE' + // © ®
    '\u203C\u2049' + // ‼ ⁉
    '\u2122\u2139' + // ™ ℹ
    '\u2194-\u2199' +
    '\u21A9\u21AA' +
    '\u231A\u231B' +
    '\u2328\u23CF' +
    '\u23E9-\u23F3' +
    '\u23F8-\u23FA' +
    '\u24C2' +
    '\u25AA\u25AB' +
    '\u25B6\u25C0' +
    '\u25FB-\u25FE' +
    '\u2600-\u2604' +
    '\u260E\u2611' +
    '\u2614\u2615' +
    '\u2618\u261D' +
    '\u2620\u2622\u2623' +
    '\u2626\u262A' +
    '\u262E\u262F' +
    '\u2638-\u263A' +
    '\u2640\u2642' +
    '\u2648-\u2653' +
    '\u265F\u2660' +
    '\u2663\u2665\u2666\u2668' +
    '\u267B\u267E\u267F' +
    '\u2692-\u2697' +
    '\u2699\u269B\u269C' +
    '\u26A0\u26A1\u26A7' +
    '\u26AA\u26AB' +
    '\u26B0\u26B1' +
    '\u26BD\u26BE' +
    '\u26C4\u26C5' +
    '\u26CE\u26CF' +
    '\u26D1\u26D3\u26D4' +
    '\u26E9\u26EA' +
    '\u26F0-\u26F5' +
    '\u26F7-\u26FA' +
    '\u26FD\u2702\u2705' +
    '\u2708-\u270D' +
    '\u270F\u2712\u2714\u2716' +
    '\u271D\u2721\u2728' +
    '\u2733\u2734\u2744\u2747\u274C\u274E' +
    '\u2753-\u2755\u2757' +
    '\u2763\u2764' +
    '\u2795-\u2797' +
    '\u27A1\u27B0\u27BF' +
    '\u2934\u2935' +
    '\u2B05-\u2B07' +
    '\u2B1B\u2B1C\u2B50\u2B55' +
    '\u3030\u303D\u3297\u3299' +
    '\uFE0F' +       // Variation Selector-16 (emoji presentation)
    '\u200D' +       // Zero Width Joiner (emoji sequences)
    ']*$',
  'u',
);

// Emoji nei piani supplementari (surrogate pairs) — gestiti via regex con flag u
const SUPPLEMENTAL_EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{1F1E0}-\u{1F1FF}\u{1F900}-\u{1F9FF}]/u;

export function asciiEmojiValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: string = control.value ?? '';
    if (!value) return null;

    // Verifica carattere per carattere: ASCII stampabile, newline, o emoji supplementare
    for (const char of value) {
      const cp = char.codePointAt(0) ?? 0;
      const isAsciiPrintable = cp >= 0x20 && cp <= 0x7e;
      const isNewline = cp === 0x0a || cp === 0x0d;
      const isSupplementalEmoji = cp >= 0x1f000 && cp <= 0x1ffff;
      const isZwj = cp === 0x200d;
      const isVariationSelector = cp >= 0xfe00 && cp <= 0xfe0f;
      const isCommonSymbol = ASCII_EMOJI_RE.test(char) || SUPPLEMENTAL_EMOJI_RE.test(char);

      if (
        !isAsciiPrintable &&
        !isNewline &&
        !isSupplementalEmoji &&
        !isZwj &&
        !isVariationSelector &&
        !isCommonSymbol
      ) {
        return { asciiEmoji: { invalidChar: char } };
      }
    }
    return null;
  };
}
