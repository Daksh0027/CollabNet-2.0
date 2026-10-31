// Curated library of campaign/event briefs that companies can start from
// instead of writing a brief from a blank form. Each template pre-fills the
// "New brief" form; everything stays fully editable before publishing.

export const CAMPAIGN_TEMPLATES = [
  {
    id: "product-launch",
    category: "Launch",
    name: "Product Launch",
    description: "Announce a new product or feature with authentic creator-led content ahead of or on launch day.",
    brief:
      "We're launching a new product and want creators to introduce it to their audience with genuine, " +
      "first-look content. Share your honest first impressions and highlight the key benefit that matters most to your followers.",
    deliverables: ["1x Instagram Reel (first look)", "3-frame Instagram Story set", "1x dedicated feed post"],
    niches: ["Lifestyle", "Tech"],
    budget_min: 500,
    budget_max: 1500,
    deadline_days: 21,
  },
  {
    id: "event-coverage",
    category: "Event",
    name: "Event Coverage & Appearance",
    description: "Invite creators to attend and document an in-person event — launch party, pop-up, conference booth, etc.",
    brief:
      "We're hosting an event and want creators on the ground capturing the experience in real time for their audience. " +
      "Travel, entry and a +1 can be arranged — see message thread for logistics after applying.",
    deliverables: ["Live Instagram Stories during the event", "1x recap Reel within 48 hours", "1x photo set for our use"],
    niches: ["Events", "Lifestyle"],
    budget_min: 400,
    budget_max: 1200,
    deadline_days: 14,
  },
  {
    id: "virtual-event-sponsorship",
    category: "Event",
    name: "Virtual Event Sponsorship",
    description: "Sponsor a webinar, livestream or virtual summit and have creators help drive registrations and attendance.",
    brief:
      "We're sponsoring a virtual event and need creators to promote registration beforehand and share highlights " +
      "during or after the stream. A strong hook for \"why attend\" matters more than production value here.",
    deliverables: ["1x pre-event promo post", "Day-of Stories reminder", "1x post-event takeaway Reel"],
    niches: ["Business", "Tech", "Education"],
    budget_min: 300,
    budget_max: 900,
    deadline_days: 10,
  },
  {
    id: "giveaway-contest",
    category: "Engagement",
    name: "Giveaway / Contest",
    description: "Run a branded giveaway to spike engagement and grow your audience through a creator's community.",
    brief:
      "Host a giveaway on your channel using our product as the prize. We'll supply the prize and key rules " +
      "(follow, like, tag a friend) — you bring the creative hook and community energy.",
    deliverables: ["1x giveaway announcement post", "2x reminder Stories", "1x winner announcement post"],
    niches: ["Lifestyle", "Beauty", "Gaming"],
    budget_min: 250,
    budget_max: 700,
    deadline_days: 18,
  },
  {
    id: "ugc-content-pack",
    category: "Content",
    name: "UGC Content Package",
    description: "Commission raw, repurposable content for our own paid ads and channels — no organic posting required.",
    brief:
      "We need authentic, UGC-style video and photo assets we can repurpose across our paid social and website. " +
      "This is a content-for-hire deliverable — organic posting to your own audience is optional, not required.",
    deliverables: ["3x vertical UGC video clips (15-30s)", "5x raw photo assets", "Usage rights for paid ads (90 days)"],
    niches: ["Any"],
    budget_min: 350,
    budget_max: 1000,
    deadline_days: 14,
  },
  {
    id: "brand-ambassador",
    category: "Ongoing",
    name: "Brand Ambassador Program",
    description: "Build an ongoing monthly partnership with creators who genuinely love and consistently use the product.",
    brief:
      "Looking for long-term brand ambassadors for a 3-6 month retainer partnership. We value consistency and " +
      "genuine product use over one-off reach — tell us why you'd be a great long-term fit when you apply.",
    deliverables: ["2x posts per month", "Ongoing Story mentions", "Early access to new drops"],
    niches: ["Lifestyle", "Fitness", "Beauty"],
    budget_min: 800,
    budget_max: 3000,
    deadline_days: 30,
  },
  {
    id: "review-unboxing",
    category: "Content",
    name: "Review & Unboxing",
    description: "Get an honest, detailed review or unboxing to build trust and answer buyers' real questions.",
    brief:
      "Send-and-review campaign: we'll ship the product, and we want your candid, detailed take — pros, cons, " +
      "and who it's actually for. Authenticity matters more than a polished pitch here.",
    deliverables: ["1x unboxing/review video (60-90s)", "1x carousel post with key takeaways"],
    niches: ["Tech", "Beauty", "Home"],
    budget_min: 200,
    budget_max: 600,
    deadline_days: 21,
  },
  {
    id: "affiliate-promo-code",
    category: "Performance",
    name: "Affiliate / Promo Code Push",
    description: "Drive trackable sales with a unique discount code or affiliate link, ideal for performance-minded creators.",
    brief:
      "We're offering a unique promo code / affiliate link so your audience gets a discount and you earn commission " +
      "on every sale. Perfect if you prefer performance-based upside alongside a flat fee.",
    deliverables: ["1x dedicated promo post or video", "Link/code in bio for 30 days", "2x reminder Stories"],
    niches: ["Any"],
    budget_min: 150,
    budget_max: 500,
    deadline_days: 14,
  },
  {
    id: "reels-series",
    category: "Content",
    name: "Instagram Reels Series",
    description: "Commission a short multi-part Reels series that tells a bigger story across a few connected posts.",
    brief:
      "We want a 3-part Reels series (e.g., before/during/after, or a mini tutorial series) that keeps viewers " +
      "coming back across the week. Creative direction is yours — just keep our product central to the story.",
    deliverables: ["3x Instagram Reels (released over 1-2 weeks)", "Cross-post to Stories on release day"],
    niches: ["Lifestyle", "Fitness", "Food"],
    budget_min: 600,
    budget_max: 1800,
    deadline_days: 24,
  },
  {
    id: "trend-challenge",
    category: "Engagement",
    name: "TikTok Challenge / Trend Participation",
    description: "Ride a current trend or kick off a branded challenge to maximize reach and shareability.",
    brief:
      "Put our product into a trending format or sound, or help kick off a branded challenge of your own. " +
      "We're optimizing for shareability and reach here, so lean into what's working on the platform right now.",
    deliverables: ["1x TikTok using a current trend/sound", "1x cross-post to Instagram Reels"],
    niches: ["Gen Z", "Entertainment", "Lifestyle"],
    budget_min: 300,
    budget_max: 900,
    deadline_days: 10,
  },
];
