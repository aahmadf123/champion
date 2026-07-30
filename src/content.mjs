/**
 * All page copy in one place, so the three design concepts and the two build
 * targets can never drift apart on content the way the old hand-maintained
 * index.html / champion.html pair drifted apart on typography.
 *
 * Copy fixes applied here versus the original page:
 *  - Bracamonte quote: the original ended "...accomplish great things make us
 *    proud Toledo Rockets", which was missing words.
 *  - "wholistic" -> "holistic".
 *  - Footer copyright gained a symbol and a year.
 *  - Milestones reframed so the section does not read as stalled (the original
 *    showed a Fall 2024 launch, an open-ended "In Progress", then two TBDs).
 *  - Urgency banner replaced with a concrete statement of where the project is.
 */

export const meta = {
  title: 'Champions Complex | University of Toledo Athletics',
  description:
    'A 74,000 sq ft facility bringing academics, nutrition, training and team space under one roof for 450+ Toledo Rocket student-athletes. Talk to the Rocket Fund team about supporting it.',
  ogDescription:
    'Support a once-in-a-generation facility for 450+ Rocket student-athletes. 74,000 sq ft for academics, nutrition, training, and team space.',
  siteName: 'University of Toledo Athletics',
  canonical: 'https://aahmadf123.github.io/champion/',
};

export const contact = {
  phone: '419.530.4183',
  phoneHref: 'tel:+14195304183',
  email: 'rocketsathleticdevelopment@utoledo.edu',
  office: 'Athletic Development Office',
  address: '2801 W. Bancroft St. MS 302, Toledo, OH 43606',
  coords: '41.6582° N, 83.6123° W',
  city: 'Toledo, Ohio',
};

export const nav = [
  { id: 'vision', label: 'Vision' },
  { id: 'spaces', label: 'Spaces' },
  { id: 'stories', label: 'Stories' },
  { id: 'day', label: 'A Day Here' },
  { id: 'impact', label: 'Impact' },
  { id: 'progress', label: 'Progress' },
  { id: 'give', label: 'Give' },
  { id: 'faq', label: 'FAQ' },
];

export const hero = {
  kicker: 'Champions Complex',
  headlineLines: ['Drawn for', 'Champions.'],
  standfirst:
    '74,000 square feet in the middle of campus, built around the day a student-athlete actually keeps.',
  sheet: 'DWG · CC-001',
  view: 'East Perspective',
  primaryCta: { label: 'Talk to the Rocket Fund team', href: '#give' },
  secondaryCta: { label: 'See the drawings', href: '#spaces' },
  stats: [
    { value: '74,000', unit: 'sq ft', label: 'Under one roof' },
    { value: '450', unit: '+', label: 'Student-athletes' },
    { value: '17', unit: '', label: 'Varsity sports' },
  ],
};

export const ticker = [
  '74,000 square feet',
  '450+ student-athletes',
  '17 varsity sports',
  'Toledo, Ohio',
  'One facility. Every Rocket.',
];

export const banner = {
  label: 'Where the project stands',
  text: 'The design is finished. The drawings on this page are final. Only the funding is left.',
  cta: { label: 'See how to help', href: '#give' },
};

export const vision = {
  label: 'The vision',
  title: 'One building for every Rocket',
  body: [
    'A Rocket crosses campus four times before dinner. Academic support in one building, nutrition in another, training in a third. Baseball and softball drive to Scott Park to reach their own locker rooms.',
    'The Champions Complex ends that. One building, middle of campus, planned around the hours athletes keep rather than the departments that serve them.',
  ],
  quote: {
    text: 'The Champions Complex is a vital commitment to our student-athletes. It guarantees they have the elite resources needed to achieve competitive excellence and succeed in every aspect of their lives.',
    who: 'Tom Moreland',
    role: 'Vice President and Director of Athletics',
  },
  legacy:
    'Among the most visible and lasting investments in Toledo Athletics history.',
};

export const spaces = {
  label: 'The drawing set',
  title: 'Championship spaces for championship athletes',
  intro:
    'Nine spaces, and ninety seconds from the front door to the far end of them.',
};

export const stories = {
  label: 'Voices of Toledo Athletics',
  title: 'Built for every Rocket',
  intro: 'From the people whose day this changes.',
  items: [
    {
      image: 'johnRichter',
      name: 'John Alan Richter',
      role: 'Quarterback',
      team: 'Toledo Football',
      sport: 'Football',
      quote:
        'This project shows that Toledo truly cares about us beyond just competition. The Champions Complex will give us the resources we need to succeed in the classroom, take care of our mental health, and fuel our bodies the right way. I am grateful to the donors who are investing in our experience and our future.',
    },
    {
      image: 'robReinstetle',
      name: 'Rob Reinstetle',
      role: 'Head Coach',
      team: 'Toledo Baseball',
      sport: 'Baseball',
      quote:
        'The Champions Complex will impact every Rocket student-athlete, and it is especially exciting to bring baseball back home to campus. Having our own locker room and practice space creates a daily environment our players can take pride in, with academic support and nutrition right there.',
    },
    {
      image: 'jessicaBracamonte',
      name: 'Jessica Bracamonte',
      role: 'Head Coach',
      team: 'Toledo Softball',
      sport: 'Softball',
      quote:
        'Having a home for softball on campus is incredibly meaningful for our program. The Champions Complex will play a huge role in elevating the student-athlete experience at Toledo, and in helping our players feel connected and supported. When you believe in them, it empowers them to accomplish great things.',
    },
  ],
};

export const day = {
  label: 'Student-athlete experience',
  title: 'A day inside the building',
  intro:
    'Six in the morning to half past seven at night. Today it crosses campus four times.',
  items: [
    {
      time: '6:00',
      meridiem: 'AM',
      venue: 'Weight room',
      title: 'Morning conditioning',
      desc: 'Before campus wakes up, Rockets are already working. Strength and conditioning sets the tone for everything that follows.',
    },
    {
      time: '8:00',
      meridiem: 'AM',
      venue: 'Training table',
      title: 'Breakfast at the training table',
      desc: 'Nutrition is performance. Chef-prepared, sport-specific meals that speed recovery and fuel a full day of classes and practice.',
    },
    {
      time: '9:30',
      meridiem: 'AM',
      venue: 'Academic center',
      title: 'Morning study session',
      desc: 'Between classes, a focused space for studying, tutoring, and advisor meetings, steps from the practice surface rather than across campus.',
    },
    {
      time: '12:30',
      meridiem: 'PM',
      venue: 'Training table',
      title: 'Team lunch',
      desc: 'More than a dining hall. Midday meals bring squads together, which is where team culture actually gets built.',
    },
    {
      time: '2:30',
      meridiem: 'PM',
      venue: 'Indoor turf',
      title: 'Afternoon practice',
      desc: 'A full-scale indoor surface means preparation never stops for weather. Year-round access keeps Rockets sharp in February.',
    },
    {
      time: '5:30',
      meridiem: 'PM',
      venue: 'Academic center',
      title: 'Evening study hall',
      desc: 'When practice ends, the academic day continues. Dedicated study hall and support help Rockets succeed in the classroom as well.',
    },
    {
      time: '7:30',
      meridiem: 'PM',
      venue: 'Team meeting room',
      title: 'Film review',
      desc: 'The day closes on preparation for the next one, in meeting rooms built for film review and presentation.',
    },
  ],
};

export const impact = {
  label: 'The impact',
  title: 'What changes on day one',
  intro:
    'Six changes, and two programs finally coming home from Scott Park.',
  items: [
    'Academics, nutrition, health, wellness, and training centralized under one roof',
    'A nutrition center and training table built for performance, not convenience',
    'Dedicated academic space with tutoring and advising on site',
    'A year-round indoor training surface shared across sports',
    'Team meeting rooms equipped for film review and presentation',
    'Baseball and softball back on the main campus, with the rest of their teammates',
  ],
  badge: { value: '74,000', label: 'square feet' },
};

export const progress = {
  label: 'Where the project stands',
  title: 'Design is done. Funding is the gate.',
  intro:
    'The drawings are done. What is left is the funding, the one part donors control.',
  steps: [
    {
      state: 'done',
      title: 'Design complete',
      detail: 'Full architectural set delivered by MSA Design',
    },
    {
      state: 'done',
      title: 'Campaign launched',
      detail: 'Rise Together opened publicly with a lead gift from the Armes family',
    },
    {
      state: 'active',
      title: 'Raising the balance',
      detail: 'Naming opportunities open now, from dedicated spaces to major areas',
    },
    {
      state: 'next',
      title: 'Groundbreaking',
      detail: 'Begins once funding is secured. Every gift moves this date closer.',
    },
  ],
  note:
    'Groundbreaking is not waiting on drawings or approvals. It is waiting on the last of the funding.',
};

export const give = {
  label: 'Your gift matters',
  title: 'How to be part of it',
  intro:
    'Gifts at this level happen in conversation, not through a form.',
  pullquote:
    'Your name, or the name of someone you love, on a building 450 athletes walk through every day.',
  tiers: [
    {
      amount: '$50,000',
      name: 'Rocket Investor',
      impact:
        'Support a dedicated space inside the Champions Complex and help elevate the daily experience of Rocket student-athletes.',
      cta: 'Call to give',
    },
    {
      amount: '$100,000',
      name: 'Champions Sponsor',
      featured: true,
      badge: 'Most requested',
      impact:
        'Fund a key amenity or student-athlete resource, with prominent recognition inside the building.',
      cta: 'Call to give',
    },
    {
      amount: '$250,000',
      name: 'Champions Circle',
      impact:
        'Secure a premier naming opportunity and leave a legacy that will outlast every roster in the building.',
      cta: 'Call to discuss',
    },
    {
      amount: '$1,000,000+',
      name: 'Legacy Gift',
      impact:
        'Naming rights to a major facility area. Join the Armes family in permanently shaping Toledo Athletics.',
      cta: 'Call to discuss',
    },
  ],
  closing:
    'Not sure where you fit? Call and ask. There is no wrong first conversation.',
};

export const faq = {
  label: 'Common questions',
  title: 'Before you call',
  items: [
    {
      q: 'How do I make a gift?',
      a: 'Call {phone} or email {email}. Someone on the team will walk you through the options personally. There is no online form for gifts at this level, by design.',
    },
    {
      q: 'Is my gift tax-deductible?',
      a: 'Yes. All gifts are received by The University of Toledo Foundation, a 501(c)(3) nonprofit. Consult your tax advisor for specifics about your situation.',
    },
    {
      q: 'Can I make a gift in honor or memory of someone?',
      a: 'Yes. Tribute gifts are one of the most meaningful ways to give here, and naming a space after someone is exactly the kind of thing this building was designed to allow. Contact the team to discuss options.',
    },
    {
      q: 'What naming opportunities are available?',
      a: 'They range from dedicated spaces to major areas of the building, and the list changes as commitments come in. Email {email} or call {phone} for what is currently open.',
    },
    {
      q: 'Can a gift be pledged over several years?',
      a: 'Yes. Multi-year pledges are common at these levels and the team will structure something that works for you.',
    },
    {
      q: 'When will construction begin?',
      a: 'The design is complete, so groundbreaking follows funding rather than any remaining design or approval work. That is the part gifts directly accelerate.',
    },
  ],
};

export const team = {
  label: 'Get involved',
  title: 'Talk to the Rocket Fund team',
  intro:
    'Any of the three of us can help you find your place in it.',
  members: [
    { image: 'connorWhelan', name: 'Connor Whelan', email: 'connor.whelan@utoledo.edu', phone: '419.530.2127' },
    { image: 'joshDittman', name: 'Josh Dittman', email: 'joshua.dittman@utoledo.edu', phone: '419.530.4183' },
    { image: 'ryleighGordon', name: 'Ryleigh Gordon', email: 'ryleigh.gordon@utoledo.edu', phone: '419.530.5316' },
  ],
};

export const footer = {
  links: [
    { label: 'UTRockets.com', href: 'https://utrockets.com' },
    { label: 'Rocket Fund', href: 'https://supportutrockets.com/' },
    { label: 'Rise Together', href: 'https://risetogethertoledo.com' },
  ],
  social: [
    { label: 'X', href: 'https://x.com/ToledoRockets', icon: 'x' },
    { label: 'Instagram', href: 'https://www.instagram.com/utrockets/', icon: 'instagram' },
    { label: 'Facebook', href: 'https://www.facebook.com/UTRockets/', icon: 'facebook' },
    { label: 'YouTube', href: 'https://www.youtube.com/@ToledoRockets', icon: 'youtube' },
  ],
  copy: `© ${new Date().getFullYear()} The University of Toledo Athletics. All rights reserved.`,
  foundation:
    'Gifts are received by The University of Toledo Foundation, a 501(c)(3) nonprofit organization.',
};
