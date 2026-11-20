export interface NavLink {
  slug: string;
  label: string;
  /** One plain line on what the page holds, for the home page's index. */
  blurb: string;
}

// Single source for the primary nav, used by the Header, the Footer, the
// 404 page and the home page's index, so they never drift out of sync.
export const primaryNav: NavLink[] = [
  { slug: 'about', label: 'About', blurb: 'How ACC began, our mission and vision, and the team.' },
  { slug: 'domains', label: 'Domains', blurb: 'Six student-run teams, from Liturgy to Outreach.' },
  { slug: 'prayers', label: 'Prayers', blurb: 'Common prayers, the litany, and the Rosary to pray along.' },
  { slug: 'calendar', label: 'Calendar', blurb: 'The week at the chapel, feasts and events by month.' },
  { slug: 'media', label: 'Media', blurb: 'Photo albums from Bereshith, Transcend and our Masses.' },
  { slug: 'contact', label: 'Contact', blurb: 'Write to us, or find the chapel on the map.' },
];
