// Single source of truth for site content.
// Values set to null are not shown on the site until they are filled in.

export const site = {
  name: 'Zero Fear',
  tagline: 'Fear Out. Freedom In.',
  // Trainers' hands-on experience (Zero Fear itself launched in 2026).
  experienceYears: 8,
  founded: 2026,
  url: 'https://zerofear.in',
  description:
    'Scooty and bike training in Kolkata for complete beginners — even if you cannot ride a cycle. One-to-one classes near Netaji Metro, Tollygunge, plus doorstep training within 10 km.',

  // Main number for calls and WhatsApp (same as the Google Business Profile).
  phone: { display: '79801 10273', tel: '+917980110273' },
  whatsapp: { display: '79801 10273', number: '917980110273' },

  area: 'Tollygunge · Netaji Metro · Kudghat',
  city: 'Kolkata',
  // Copied exactly from the Google Business Profile so name/address/phone match everywhere.
  address: 'Near, 12, post, Samargarh, Paschim Putiary, Kolkata, West Bengal 700041' as string | null,
  streetAddress: 'Near, 12, post, Samargarh, Paschim Putiary',
  postalCode: '700041',
  hours: null as string | null, // e.g. 'Mon–Sun · 6:00 AM – 10:00 PM'
  mapQuery: 'Near, 12, post, Samargarh, Paschim Putiary, Kolkata, West Bengal 700041',

  stats: [
    { value: '4.9★', label: 'Google rating' },
    { value: '300+', label: 'Google reviews' },
    { value: '5000+', label: 'Learners trained' },
    { value: '8+ Years', label: 'Training experience' },
  ],

  googleReviewsUrl: 'https://www.google.com/maps/search/?api=1&query=Zero%20Fear%20Kolkata',
  // Set a link to null to hide it everywhere.
  social: {
    youtube: null as string | null,
    instagram: 'https://www.instagram.com/scooty_bike_training_centre/' as string | null,
    facebook: 'https://www.facebook.com/freelancetwowheelertraining.co.in' as string | null,
  },

};

// Photos: drop files into /public/images and set `src` (e.g. '/images/hero.jpg').
// An empty src renders a branded tile instead of a broken image.
export const photos = {
  hero: { src: '/images/hero-trainer-guiding.webp', alt: 'Zero Fear trainer guiding a beginner on a scooty in Kolkata', position: '50% 40%' },
  howItWorks: { src: '/images/how-it-works-briefing.webp', alt: 'Trainer explaining scooty controls to new learners before the first ride', position: '50% 50%' },
  doorstep: { src: '/images/doorstep-lane-training.webp', alt: 'Trainer walking beside a learner on a quiet residential lane', position: '50% 30%' },
};

// Shown in "From our classes" until photos are loaded from the database.
export const gallery = [
  { src: '/images/gallery-first-ride.webp', alt: 'Learner on her first scooty ride, feet ready on the ground' },
  { src: '/images/gallery-trainer-explaining.webp', alt: 'Trainer explaining throttle and brake control to a beginner' },
  { src: '/images/gallery-any-age.webp', alt: 'Trainer walking beside a learner on a quiet lane' },
  { src: '/images/gallery-bike-with-trainer.webp', alt: 'Bike learner with her trainer before a practice ride' },
  { src: '/images/gallery-hands-on.webp', alt: 'Trainer guiding a learner’s hand on the throttle' },
  { src: '/images/gallery-family-support.webp', alt: 'Older learner on a scooty while her family watches the lesson' },
  { src: '/images/gallery-group-lesson.webp', alt: 'Trainer explaining the scooty controls to a group of learners' },
  { src: '/images/gallery-proud-moment.webp', alt: 'Family filming a learner’s ride on a quiet tree-lined road' },
];

export type Phase = { title: string; classes: string; text: string; outcome?: string };

export type Course = {
  slug: string;
  level: string;
  name: string;
  summary: string;
  forWho: string;
  classes: string;
  points: string[];
  price: number | null; // starting fee in ₹
  // Course page
  headline: string;
  intro: string;
  facts: { value: string; label: string }[];
  photo: { src: string; alt: string; position?: string; cms?: import('../cms/schema').Photo };
  phases: Phase[];
  note?: string;
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
    price: 2500,
    headline: 'Start from zero. <mark>Build control before speed.</mark>',
    intro:
      'Made for complete beginners, including people who have never ridden a cycle. You move from getting to know the scooty to balance, turning and riding on real roads, one step at a time.',
    facts: [
      { value: '15', label: 'Classes' },
      { value: '30 min', label: 'Per class' },
      { value: '1-to-1', label: 'With a trainer' },
      { value: 'No cycle', label: 'Needed' },
    ],
    photo: { src: '/images/trainers-walk-alongside.webp', alt: 'Two trainers walking beside a beginner on her first scooty ride', position: '50% 25%' },
    phases: [
      { title: 'Get to know the scooty', classes: 'Classes 1–3', text: 'Sitting posture, handle, throttle and both brakes. Your trainer moves the scooty with you so nothing feels sudden.', outcome: 'The scooty stops feeling scary.' },
      { title: 'Balance and basic control', classes: 'Classes 4–6', text: 'Riding in a straight line, slow-speed control, smooth starts and controlled stops. Start → move → stop, again and again.', outcome: 'You can balance and ride straight with your feet up.' },
      { title: 'Turning', classes: 'Classes 7–9', text: 'Left and right turns, speed control in turns, using indicators, and braking while turning.', outcome: 'You can turn into lanes and corners smoothly.' },
      { title: 'Riding on the road', classes: 'Classes 10–12', text: 'Quiet residential roads with your trainer: looking ahead, road awareness and fixing weak spots.', outcome: 'You feel comfortable riding on a calm road.' },
      { title: 'Confidence', classes: 'Classes 13–15', text: 'More practice, safe riding habits and getting ready to ride on your own.', outcome: 'You can ride the scooty independently.' },
    ],
  },
  {
    slug: 'advanced-scooty-training',
    level: 'Advanced',
    name: 'Advanced Scooty Training',
    summary: 'Busy-road practice, lane discipline and handling Kolkata traffic.',
    forWho: 'People who can ride but don’t feel confident on the road',
    classes: '10 classes',
    points: ['Traffic & lane practice', 'Turning and overtaking', 'Good as a refresher'],
    price: 2500,
    headline: 'You can ride. <mark>Now own the traffic.</mark>',
    intro:
      'For riders who already have basic control but feel nervous in traffic, or haven’t ridden in a long time. You practise real Kolkata road situations with a trainer beside you.',
    facts: [
      { value: '10', label: 'Classes' },
      { value: '4', label: 'Stages' },
      { value: 'Real', label: 'Roads' },
      { value: '1-to-1', label: 'With a trainer' },
    ],
    photo: { src: '/images/trainer-demo-scooter.webp', alt: 'Trainer showing two learners how to handle a scooter' },
    phases: [
      { title: 'Busy-road introduction', classes: 'Classes 1–2', text: 'Reading the road, traffic awareness, speed awareness, braking decisions and road position.' },
      { title: 'Real road situations', classes: 'Classes 3–5', text: 'Turning in traffic, junctions, speed control, braking response and making decisions on the move.' },
      { title: 'Advanced confidence', classes: 'Classes 6–8', text: 'Busy roads, speed breakers, defensive riding, safe overtaking and riding with a pillion where needed.' },
      { title: 'Final practice', classes: 'Classes 9–10', text: 'Fixing weak spots, building traffic confidence and RTO test practice if you need it.' },
    ],
  },
  {
    slug: 'bike-training',
    level: 'Motorcycle',
    name: 'Bike Training',
    summary: 'Clutch, gears and smooth acceleration, step by step, then road riding.',
    forWho: 'Learners who can balance a cycle',
    classes: '15 classes',
    points: ['Clutch & gear control', 'Smooth starts and stops', 'Road riding'],
    price: 2500,
    headline: 'Clutch, gears, road. <mark>Step by step.</mark>',
    intro:
      'A 15-class course that takes you from getting to know the bike to clutch and gear control, smooth acceleration, braking and riding on the road.',
    facts: [
      { value: '15', label: 'Classes' },
      { value: '30 min', label: 'Per class' },
      { value: 'Clutch', label: '& gear control' },
      { value: 'Road', label: 'Riding practice' },
    ],
    photo: { src: '/images/bike-royal-enfield.webp', alt: 'Learner riding a motorcycle with her trainer beside her', position: '50% 40%' },
    phases: [
      { title: 'Get to know the bike', classes: 'Classes 1–3', text: 'Posture, handle, brakes, balance, starting and stopping.' },
      { title: 'Clutch and gears', classes: 'Classes 4–6', text: 'Releasing the clutch, choosing gears, moving off from a stop and low-speed control.' },
      { title: 'Clutch + gear + throttle', classes: 'Classes 7–9', text: 'Smooth acceleration, changing gears, braking and turning together.' },
      { title: 'Riding on the road', classes: 'Classes 10–12', text: 'Observation, traffic awareness, turning, speed control and road position.' },
      { title: 'Confidence and test practice', classes: 'Classes 13–15', text: 'Fixing weak spots, more road practice and RTO test practice if you need it.' },
    ],
    note: 'You need basic cycle balance for this course. Finishing it does not mean you can safely ride high-power bikes; every bike’s weight and power is different.',
  },
  {
    slug: 'rto-exam-preparation',
    level: 'Licence test',
    name: 'RTO Test Preparation',
    summary: 'Practise the exact movements the driving test asks for, including the figure 8.',
    forWho: 'Anyone with an upcoming two-wheeler driving test',
    classes: 'Flexible',
    points: ['Figure-8 track drills', 'Slow-speed balance', 'Mock test'],
    price: 2500,
    headline: 'Walk into your RTO test <mark>ready.</mark>',
    intro:
      'Test-focused practice for your two-wheeler driving test: control, turning, braking, starting and stopping, and the figure 8, with your weak spots fixed before test day.',
    facts: [
      { value: 'Figure 8', label: 'Track practice' },
      { value: 'Mock', label: 'Test run' },
      { value: 'Flexible', label: 'Number of classes' },
      { value: '1-to-1', label: 'With a trainer' },
    ],
    photo: { src: '/images/gallery-trainer-explaining.webp', alt: 'Trainer explaining controls to a learner before practice' },
    phases: [
      { title: 'Understand the test', classes: 'Stage 1', text: 'What the test checks, the movements involved, and where you stand today.' },
      { title: 'Practical control', classes: 'Stage 2', text: 'Starting, stopping, balance, braking and turning.' },
      { title: 'Test practice', classes: 'Stage 3', text: 'Figure-8 drills and other test movements, repeated until they feel easy.' },
      { title: 'Final preparation', classes: 'Stage 4', text: 'A full practice run, last corrections and getting you ready for test day.' },
    ],
    note: 'We prepare you properly for the test. We do not promise a guaranteed licence.',
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

export const journey = [
  { year: '2018', title: 'First classes', text: 'Our trainers start teaching two-wheeler riding in Kolkata, with one rule: start from the learner.' },
  { year: '2020', title: 'A proper method', text: 'Teaching becomes a step-by-step course: balance first, then control, then real roads.' },
  { year: '2024', title: 'Thousands of learners', text: 'Doorstep classes, bike training and RTO preparation grow from what learners asked for.' },
  { year: '2026', title: 'Zero Fear begins', text: 'Our trainers launch Zero Fear: a beginner-first school built on 8 years of experience.' },
];

export const womenPoints = [
  { title: 'Patient, never rushed', text: 'Calm, trainer-led classes. No pressure, no shouting.' },
  { title: 'Control before roads', text: 'You master balance in a quiet place before any traffic.' },
  { title: 'Any age, any background', text: 'College students, working women, mothers and grandmothers.' },
];

export const ticker = ['No cycling needed', 'One-to-one classes', 'Women-friendly trainers', 'Doorstep within 10 km', 'From ₹2,500', 'Real Kolkata roads'];

// Doorstep fee by distance (km) from Netaji Metro / Kudghat.
export const doorstep = {
  radiusKm: 10,
  from: 'Netaji Metro / Kudghat',
  areas: ['New Alipore', 'Behala', 'Jadavpur', 'Bagha Jatin', 'Thakurpukur', 'Hazra'],
  allAreas: ['Garia', 'Jadavpur', 'Ranikuthi', 'Behala', 'Haridevpur', 'Naktala', 'Bansdroni', 'Kudghat', 'New Alipore', 'Bagha Jatin', 'Thakurpukur', 'Hazra'],
  stats: [
    { value: '500+', label: 'Doorstep learners' },
    { value: '1000+', label: 'Home classes' },
    { value: '10 km', label: 'Service radius' },
  ],
  steps: [
    { title: 'Share your area', text: 'Send your area or a landmark on WhatsApp.' },
    { title: 'We check the distance', text: 'We measure the distance from Netaji Metro / Kudghat and confirm the fee.' },
    { title: 'Pick a course and time', text: 'Scooty or bike, morning or evening: whatever suits your routine.' },
    { title: 'Your trainer arrives', text: 'Your trainer comes to you at the agreed time.' },
    { title: 'Training begins', text: 'You start on a quiet lane near home and follow the same step-by-step course as at our centre.' },
  ],
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
    a: 'Call us, message us on WhatsApp, or fill in the booking form and we’ll call you back to fix a slot.',
  },
];

// Extra questions shown on the FAQ page (after the home-page ones).
export const moreFaqs = [
  {
    q: 'How long is each class?',
    a: 'About 30 minutes for Basic Scooty and Bike Training. Every class is one-to-one with a trainer.',
  },
  {
    q: 'Do I need my own scooty or bike?',
    a: 'No. Training vehicles are provided. If you prefer, you can also learn on your own scooty, which is common with doorstep training.',
  },
  {
    q: 'Is it too late to learn at my age?',
    a: 'No. We regularly train older beginners, homemakers and working professionals. The pace is set by you, not by the trainer.',
  },
  {
    q: 'What does a course cost?',
    a: 'Courses start from ₹2,500. Doorstep training is priced by distance from Netaji Metro / Kudghat; you can check it with the fee calculator on the Doorstep page.',
  },
  {
    q: 'Which areas does doorstep training cover?',
    a: 'Places within 10 km of Netaji Metro / Kudghat, such as Garia, Jadavpur, Behala, Naktala, Bansdroni, New Alipore and Thakurpukur. Send us your area to confirm.',
  },
  {
    q: 'Will you teach me to ride in real traffic?',
    a: 'Yes. Every course ends with practice on real roads with your trainer, starting with quiet lanes and moving to normal traffic when you’re ready.',
  },
];

export const nav = [
  { href: '/courses', label: 'Courses' },
  { href: '/doorstep-training', label: 'Doorstep' },
  { href: '/women-riders', label: 'Women riders' },
  { href: '/blog', label: 'Blog' },
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
];

export const waLink = (text: string) =>
  `https://wa.me/${site.whatsapp.number}?text=${encodeURIComponent(text)}`;

export const formatINR = (n: number) => '₹' + n.toLocaleString('en-IN');
