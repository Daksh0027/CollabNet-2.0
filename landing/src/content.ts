/**
 * Every piece of copy on the landing page lives here. Edit freely; the
 * components only read from this file.
 */

export type NavLink = { label: string; href: string }

export type FeatureIllustration = 'match' | 'dealroom' | 'escrow' | 'calendar'

export type Feature = {
  id: string
  title: string
  description: string
  illustration: FeatureIllustration
  /** Layout hint for the bento grid. */
  size: 'tall' | 'regular' | 'wide'
}

export type Stat = {
  value: string
  label: string
  detail: string
  tone: 'emphasis' | 'inverse' | 'light'
}

export type MetricChip = {
  label: string
  /** Signed change, rendered verbatim, e.g. "+180%" or "−25%". */
  change: string
  direction: 'up' | 'down'
}

export type ProofCard = {
  heading: string
  name: string
  initials: string
  role: string
  summary: string
  footnote: string
  chips: MetricChip[]
}

export type Faq = { id: string; question: string; answer: string }

export type FooterColumn = { title: string; links: NavLink[] }

export type LandingContent = {
  product: {
    name: string
    tagline: string
  }
  /** The ONE primary action. This label is reused everywhere it appears. */
  primaryAction: {
    label: string
    successTitle: string
    successBody: string
    emailLabel: string
    emailPlaceholder: string
    emptyError: string
    invalidError: string
    serverError: string
    privacyNote: string
  }
  nav: {
    links: NavLink[]
    menuLabel: string
  }
  hero: {
    status: string
    headlineBefore: string
    headlineAfter: string
    subtext: string
    proof: string
  }
  showcase: {
    heading: string
    caption: string
  }
  logos: {
    heading: string
    names: string[]
  }
  features: {
    eyebrow: string
    heading: string
    subtext: string
    items: Feature[]
  }
  stats: {
    eyebrow: string
    heading: string
    items: Stat[]
  }
  proof: {
    eyebrow: string
    heading: string
    subtext: string
    before: ProofCard
    after: ProofCard
  }
  faq: {
    eyebrow: string
    heading: string
    items: Faq[]
  }
  closing: {
    heading: string
    subtext: string
  }
  footer: {
    blurb: string
    columns: FooterColumn[]
    legal: string
    themeLabel: string
  }
}

export const content: LandingContent = {
  product: {
    name: 'CollaboNet',
    tagline: 'The deal room for creators and sponsors.',
  },
  primaryAction: {
    label: 'Join waitlist',
    successTitle: "You're on the list.",
    successBody: "We'll email you when your invite is ready. Early teams get escrow fees waived for 3 months.",
    emailLabel: 'Work email',
    emailPlaceholder: 'you@studio.com',
    emptyError: 'Enter your email address to join the waitlist.',
    invalidError: 'That email looks incomplete. Try a format like name@studio.com.',
    serverError: "We couldn't save your spot just now. Please try again in a moment.",
    privacyNote: 'No spam. One email when your invite is ready.',
  },
  nav: {
    links: [
      { label: 'Product', href: '#showcase' },
      { label: 'Features', href: '#features' },
      { label: 'Results', href: '#results' },
      { label: 'FAQ', href: '#faq' },
    ],
    menuLabel: 'Menu',
  },
  hero: {
    status: 'Private beta · Invites rolling out weekly',
    headlineBefore: 'Where creators and sponsors',
    headlineAfter: 'close better deals',
    subtext: 'Find the right partner, sign the contract, and get paid through escrow, all in one shared deal room.',
    proof: 'Joined by 2,400+ creators and 180 brand teams',
  },
  showcase: {
    heading: 'One workspace from first message to final payout',
    caption: 'A live deal room: brief, contract, escrow and delivery timeline side by side.',
  },
  logos: {
    heading: 'Trusted by creator studios and brand teams',
    names: ['Northwind', 'Lumen Labs', 'Kestrel', 'Orbitly', 'Fieldnote', 'Brightwave', 'Paperplane', 'Halcyon'],
  },
  features: {
    eyebrow: 'Features',
    heading: 'Everything a partnership needs, nothing it doesn’t',
    subtext: 'Replace the DMs, spreadsheets, and invoice chasing with one flow both sides can trust.',
    items: [
      {
        id: 'match',
        title: 'Matches with real benchmarks',
        description: 'Filter verified creators by niche, audience, and engagement, with AI rate benchmarks for every offer.',
        illustration: 'match',
        size: 'tall',
      },
      {
        id: 'dealroom',
        title: 'Deal rooms with e-sign',
        description: 'Scope, deliverables, dates and pay in one contract that both sides sign in minutes.',
        illustration: 'dealroom',
        size: 'regular',
      },
      {
        id: 'escrow',
        title: 'Escrow-protected payouts',
        description: 'Sponsors fund upfront, and creators are paid the moment delivery is confirmed.',
        illustration: 'escrow',
        size: 'regular',
      },
      {
        id: 'calendar',
        title: 'A shared campaign calendar',
        description: 'Every post, draft, and review date lands on one calendar that both dashboards track.',
        illustration: 'calendar',
        size: 'wide',
      },
    ],
  },
  stats: {
    eyebrow: 'By the numbers',
    heading: 'Partnerships that actually ship',
    items: [
      { value: '2,400+', label: 'Verified creators', detail: 'Across 40 niches, from tech reviews to fitness.', tone: 'emphasis' },
      { value: '$4.2M', label: 'Paid out via escrow', detail: 'Released on confirmed delivery, never chased.', tone: 'light' },
      { value: '48 hrs', label: 'Median time to signed deal', detail: 'From first message to countersigned contract.', tone: 'light' },
      { value: '4.9 / 5', label: 'Average collaboration rating', detail: 'Moderated reviews from both sides of every deal.', tone: 'inverse' },
    ],
  },
  proof: {
    eyebrow: 'Results',
    heading: 'Same creator. Very different quarter.',
    subtext: 'Maya ran sponsorships over DMs and email for two years. Here is her first quarter on CollaboNet.',
    before: {
      heading: 'Before',
      name: 'Maya Chen',
      initials: 'MC',
      role: 'Tech creator · DMs and spreadsheets',
      summary: 'Offers buried in DMs, contracts in PDFs, invoices chased for weeks.',
      footnote: '3 deals · 41-day average payout',
      chips: [
        { label: 'Inbound offers', change: '−25%', direction: 'down' },
        { label: 'On-time payouts', change: '−14%', direction: 'down' },
      ],
    },
    after: {
      heading: 'After',
      name: 'Maya Chen',
      initials: 'MC',
      role: 'Tech creator · Verified on CollaboNet',
      summary: 'Matched briefs, e-signed scopes, and escrow released on delivery.',
      footnote: '11 deals · 2-day average payout',
      chips: [
        { label: 'Inbound offers', change: '+180%', direction: 'up' },
        { label: 'Average deal value', change: '+64%', direction: 'up' },
      ],
    },
  },
  faq: {
    eyebrow: 'FAQ',
    heading: 'Questions, answered',
    items: [
      {
        id: 'who',
        question: 'Who is CollaboNet for?',
        answer: 'Independent creators, creator studios, and brand or agency teams that run sponsored campaigns and want one place to find partners, agree terms, and handle payment.',
      },
      {
        id: 'escrow',
        question: 'How does escrow work?',
        answer: 'The sponsor funds the agreed amount when the contract is signed. Funds are held by our payments partner and released to the creator as soon as delivery is confirmed, or automatically after the review window closes.',
      },
      {
        id: 'cost',
        question: 'What does it cost?',
        answer: 'Joining and browsing are free. A small fee applies to escrow payments only. Waitlist members get escrow fees waived for their first three months.',
      },
      {
        id: 'verify',
        question: 'How are creators and sponsors verified?',
        answer: 'Creators connect their channels so audience and engagement data come straight from the platform. Sponsors verify their business domain before sending briefs.',
      },
      {
        id: 'invite',
        question: 'When will I get access?',
        answer: 'We send invites every week in the order people join the waitlist, and prioritise complete creator and sponsor pairs.',
      },
    ],
  },
  closing: {
    heading: 'Your next partnership starts in the deal room',
    subtext: 'Join the waitlist and be among the first to run campaigns on CollaboNet.',
  },
  footer: {
    blurb: 'The deal room for creators and sponsors: match, sign, deliver and get paid in one place.',
    columns: [
      {
        title: 'Product',
        links: [
          { label: 'Overview', href: '#showcase' },
          { label: 'Features', href: '#features' },
          { label: 'Results', href: '#results' },
          { label: 'FAQ', href: '#faq' },
        ],
      },
      {
        title: 'Company',
        links: [
          { label: 'About', href: '#top' },
          { label: 'Careers', href: '#top' },
          { label: 'Contact', href: 'mailto:hello@collabonet.example' },
        ],
      },
      {
        title: 'Legal',
        links: [
          { label: 'Privacy', href: '#top' },
          { label: 'Terms', href: '#top' },
        ],
      },
    ],
    legal: '© 2026 CollaboNet. Placeholder logos are fictional.',
    themeLabel: 'Dark mode',
  },
}
