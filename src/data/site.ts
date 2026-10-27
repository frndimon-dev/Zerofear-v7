// Single source of truth for site content.
// Values set to null are not shown on the site until they are filled in.

export const site = {
  name: 'Zero Fear',
  tagline: 'Fear Out. Freedom In.',
  formerly: 'Kolkata Scooty & Bike Training Centre',
  since: 2018,
  url: 'https://zerofear-v7.vercel.app',
  description:
    'Scooty and bike training in Kolkata for complete beginners — even if you cannot ride a cycle. One-to-one classes near Netaji Metro, Tollygunge, plus doorstep training within 10 km.',

  phone: { display: '79801 08587', tel: '+917980108587' },
  whatsapp: { display: '97484 85630', number: '919748485630' },

  area: 'Tollygunge · Netaji Metro · Kudghat',
  city: 'Kolkata',
  address: null as string | null, // e.g. 'Near Netaji Metro Station, Tollygunge, Kolkata 700040'
  hours: null as string | null, // e.g. 'Mon–Sun · 6:00 AM – 8:00 PM'
  mapQuery: 'Netaji Metro Station, Tollygunge, Kolkata',

  stats: [
    { value: '4.9★', label: 'Google rating' },
    { value: '300+', label: 'Google reviews' },
    { value: '5000+', label: 'Learners trained' },
    { value: 'Since 2018', label: 'Training in Kolkata' },
  ],

  googleReviewsUrl: 'https://www.google.com/maps/search/?api=1&query=Zero%20Fear%20Kolkata',
  social: {
    youtube: 'https://www.youtube.com/@kolkatascootybiketrainingcentr',
    instagram: 'https://www.instagram.com/scooty_bike_training_centre/',
    facebook: 'https://www.facebook.com/freelancetwowheelertraining.co.in',
  },

  supabase: {
    url: 'https://fhsslykxcwbpzqusouii.supabase.co',
    publishableKey: 'sb_publishable_QC_9-e0uIV2EEzJUwr4plg_TdhK8ozF',
  },
};

// Photos: drop files into /public/images and set `src` (e.g. '/images/hero.jpg').
// An empty src renders a branded tile instead of a broken image.
export const photos = {
  hero: { src: '', alt: 'Zero Fear trainer guiding a beginner on a scooty in Kolkata' },
  doorstep: { src: '', alt: 'Doorstep scooty training near the learner’s home' },
};

export type Course = {
  slug: string;
  level: string;
  name: string;
  summary: string;
  forWho: string;
  classes: string;
  points: string[];
  price: number | null;
};

export const courses: Course[] = [
  {
    slug: 'basic-scooty-training',
    level: 'Beginner',
    name: 'Basic Scooty Training',
    summary: 'Start from zero. Balance, throttle and braking first, then real roads.',
    forWho: 'Complete beginners and people who can’t ride a cycle',
    classes: '15 classes · 30 min each',
    points: ['No cycling needed', 'One-to-one with a trainer', 'Practice ground → real road'],
    price: null,
  },
  {
    slug: 'advanced-scooty-training',
    level: 'Advanced',
    name: 'Advanced Scooty Training',
    summary: 'Busy-road practice, lane discipline and handling Kolkata traffic.',
    forWho: 'People who can ride but don’t feel confident on the road',
    classes: '10 classes',
    points: ['Traffic & lane practice', 'Turning and overtaking', 'Good as a refresher'],
    price: null,
  },
  {
    slug: 'bike-training',
    level: 'Motorcycle',
    name: 'Bike Training',
    summary: 'Clutch, gears and smooth acceleration, step by step, then road riding.',
    forWho: 'Learners who can balance a cycle',
    classes: '15 classes',
    points: ['Clutch & gear control', 'Smooth starts and stops', 'Road riding'],
    price: null,
  },
  {
    slug: 'rto-exam-preparation',
    level: 'Licence test',
    name: 'RTO Test Preparation',
    summary: 'Practise the exact movements the driving test asks for, including the figure 8.',
    forWho: 'Anyone with an upcoming two-wheeler driving test',
    classes: 'Flexible',
    points: ['Figure-8 track drills', 'Slow-speed balance', 'Mock test'],
    price: null,
  },
];

export const steps = [
  {
    title: 'Start at your level',
    text: 'Can’t ride a cycle? No problem. We begin with balance, feet down, at walking pace.',
  },
  {
    title: 'Build control',
    text: 'Throttle, brakes and turns on a safe practice ground until they feel natural.',
  },
  {
    title: 'Ride on real roads',
    text: 'Your trainer moves you to quiet roads first, then normal Kolkata traffic.',
  },
  {
    title: 'Ride on your own',
    text: 'We fix weak spots and finish when you can ride confidently without help.',
  },
];

// Doorstep fee by distance (km) from Netaji Metro / Kudghat.
export const doorstep = {
  radiusKm: 10,
  from: 'Netaji Metro / Kudghat',
  areas: ['New Alipore', 'Behala', 'Jadavpur', 'Bagha Jatin', 'Thakurpukur', 'Hazra'],
  tiers: [
    { upToKm: 2, fee: 4500 },
    { upToKm: 3, fee: 5000 },
  ],
  maxFee: 8000,
};

export type Review = { name: string; meta: string; quote: string; rating: number };

// Shown until real reviews are loaded from the database.
export const reviews: Review[] = [
  {
    name: 'Sneha Mukherjee',
    meta: 'Basic Scooty · Tollygunge',
    quote: 'I couldn’t even ride a cycle before. After step-by-step practice, my fear of riding is mostly gone.',
    rating: 5,
  },
  {
    name: 'Arindam Ghosh',
    meta: 'Bike Training · South Kolkata',
    quote: 'Clutch and gears were made really easy. Learned safely in 5 sessions. Highly recommended.',
    rating: 5,
  },
  {
    name: 'Priyanka Sen',
    meta: 'Doorstep Training · Behala',
    quote: 'They came to Behala and taught me on my own scooter. Very patient trainers!',
    rating: 5,
  },
];

export const faqs = [
  {
    q: 'I can’t ride a cycle. Can I still learn to ride a scooty?',
    a: 'Yes. Most of our beginners can’t cycle. We start with feet-down balance and gentle throttle control, so you never need cycling skills for a scooty.',
  },
  {
    q: 'How many classes are in Basic Scooty Training?',
    a: '15 classes of about 30 minutes each, one-to-one with a trainer.',
  },
  {
    q: 'Do you offer training at my home?',
    a: 'Yes. Doorstep training is available within 10 km of Netaji Metro / Kudghat. Send us your area and we’ll confirm.',
  },
  {
    q: 'What do I need for Bike Training?',
    a: 'You should be able to balance a cycle, because a bike needs clutch, gear and throttle together.',
  },
  {
    q: 'Do you help with the RTO driving test?',
    a: 'Yes. We practise the test track, including the figure 8, slow-speed balance and road rules. We don’t promise a guaranteed licence; we prepare you properly for the test.',
  },
  {
    q: 'How do I book?',
    a: 'Call us, message us on WhatsApp, or fill in the form below and we’ll get back to you.',
  },
];

export const nav = [
  { href: '#courses', label: 'Courses' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#doorstep', label: 'Doorstep' },
  { href: '#reviews', label: 'Reviews' },
  { href: '#faq', label: 'FAQ' },
  { href: '#contact', label: 'Contact' },
];

export const waLink = (text: string) =>
  `https://wa.me/${site.whatsapp.number}?text=${encodeURIComponent(text)}`;

export const formatINR = (n: number) => '₹' + n.toLocaleString('en-IN');
