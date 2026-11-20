// The one place Scripture used anywhere on the site is defined, with its
// translation named. Every wording here has been checked against a real
// translation (see docs/DESIGN_NOTES.md) — nothing is transcribed from
// memory. To add a verse elsewhere, add it here and reference it by key;
// don't inline a verse in a page.

export interface Verse {
  text: string;
  /** e.g. "Matthew 23:11" */
  reference: string;
  /** short translation tag, e.g. "ESV" */
  translation: string;
}

export const scripture = {
  servant: {
    text: 'The greatest among you shall be your servant.',
    reference: 'Matthew 23:11',
    translation: 'ESV',
  },
  children: {
    text: 'Let the little children come to me and do not hinder them.',
    reference: 'Matthew 19:14',
    translation: 'ESV',
  },
  gathered: {
    text: 'For where two or three gather in my name, there am I with them.',
    reference: 'Matthew 18:20',
    translation: 'NIV',
  },
} satisfies Record<string, Verse>;

export type ScriptureId = keyof typeof scripture;
