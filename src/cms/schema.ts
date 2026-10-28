// What the admin panel can edit, with the built-in defaults.
// Text: `*words*` marks the highlighted (yellow) part of a line.
// Limits come from the default text so edits can't break the layout.

import type { FontKey } from './fonts';
import { gallery as defaultGallery } from '../data/site';

export type Pt = { x: number; y: number }; // object-position in %
export type Box = { x: number; y: number; w: number; h: number }; // % of the image

export type Photo = {
  src: string;
  srcSm?: string; // smaller copy for phones and cards
  mobileSrc?: string; // optional separate photo for phones
  alt: string;
  w?: number;
  h?: number;
  focus?: { d?: Pt; m?: Pt }; // d = desktop, m = phone
  keep?: Box[]; // areas the owner marked as must-stay-visible
  people?: { box: Box; head: Box; on: boolean }[]; // found by the photo editor
  peopleM?: { box: Box; head: Box; on: boolean }[]; // same, for the separate phone photo
};

// A place where a photo is shown. ratios = narrowest..widest width/height the
// photo is cropped to on that kind of screen.
export type Frame = { label: string; ratios: [number, number]; use: 'd' | 'm' };

export type TextKind = 'line' | 'para' | 'headline';
export type TextField = { label: string; value: string; kind: TextKind; font?: FontKey };
export type PhotoSlot = { label: string; photo: Photo; frames: Frame[] };

export type Section = {
  id: string;
  label: string;
  movable: boolean;
  texts: Record<string, TextField>;
  photos?: Record<string, PhotoSlot>;
};

const h = (label: string, value: string, font: FontKey = 'anton'): TextField => ({ label, value, kind: 'headline', font });
const line = (label: string, value: string): TextField => ({ label, value, kind: 'line' });
const para = (label: string, value: string): TextField => ({ label, value, kind: 'para' });

export const frames = {
  heroD: { label: 'Computer', ratios: [1.6, 2.8], use: 'd' },
  heroM: { label: 'Phone', ratios: [0.75, 1], use: 'm' },
  card45: { label: 'Computer', ratios: [0.8, 0.8], use: 'd' },
  tile: { label: 'Slider card', ratios: [0.7, 0.85], use: 'd' },
  tileM: { label: 'Slider card (phone)', ratios: [0.7, 0.75], use: 'm' },
} satisfies Record<string, Frame>;

export const sections: Section[] = [
  {
    id: 'hero', label: 'Hero (top of page)', movable: false,
    texts: {
      kicker: line('Small line above the headline', 'Scooty & bike training · Kolkata'),
      title: h('Headline on the photo', 'Ride without *fear.*'),
      lead: line('Line under the photo', 'Can’t ride a cycle? *You can still ride.*'),
      book: line('Main button', 'Book a class'),
    },
    photos: {
      main: {
        label: 'Hero photo',
        photo: { src: '/images/hero-wide.webp', mobileSrc: '/images/hero-tall.webp', alt: 'Zero Fear learners on their scooties with their trainers in a Kolkata lane', focus: { d: { x: 50, y: 55 }, m: { x: 50, y: 30 } } },
        frames: [frames.heroD, frames.heroM],
      },
    },
  },
  {
    id: 'ticker', label: 'Yellow moving strip', movable: true,
    texts: {
      t1: line('Item 1', 'No cycling needed'),
      t2: line('Item 2', 'One-to-one classes'),
      t3: line('Item 3', 'Women-friendly trainers'),
      t4: line('Item 4', 'Doorstep within 10 km'),
      t5: line('Item 5', 'From ₹2,500'),
      t6: line('Item 6', 'Real Kolkata roads'),
    },
  },
  {
    id: 'about', label: 'About Zero Fear', movable: true,
    texts: {
      eyebrow: line('Section name', 'About Zero Fear'),
      title: h('Headline', 'Never rode a cycle? We’ll get you riding Kolkata roads *on your own.*', 'fraunces'),
      lead: para('Text', 'Patient trainers, one learner at a time. Practice ground first, real traffic only when you’re ready.'),
      button: line('Button', 'Our story'),
      badge: line('Yellow badge text', 'beginners now ride on their own'),
    },
    photos: {
      main: {
        label: 'Photo',
        photo: { src: '/images/hero-trainer-guiding.webp', alt: 'Zero Fear trainer guiding a beginner on her scooty', focus: { d: { x: 50, y: 50 }, m: { x: 50, y: 40 } } },
        frames: [frames.card45, { label: 'Phone', ratios: [1.1, 1.12], use: 'm' }],
      },
    },
  },
  {
    id: 'courses', label: 'Courses slider', movable: true,
    texts: {
      eyebrow: line('Section name', 'Courses'),
      title: h('Headline', 'Pick your *starting point.*'),
      button: line('Button', 'All courses'),
    },
  },
  {
    id: 'women', label: 'Women riders', movable: true,
    texts: {
      eyebrow: line('Section name', 'For women riders'),
      title: h('Headline', 'She decides where she *goes.*'),
      lead: para('Text', 'Work, college, the market, your child’s school. Riding means going where you need to, without waiting for anyone.'),
      p1t: line('Point 1 title', 'Patient, never rushed'),
      p1: line('Point 1 text', 'Calm, trainer-led classes. No pressure, no shouting.'),
      p2t: line('Point 2 title', 'Control before roads'),
      p2: line('Point 2 text', 'You master balance in a quiet place before any traffic.'),
      p3t: line('Point 3 title', 'Any age, any background'),
      p3: line('Point 3 text', 'College students, working women, mothers and grandmothers.'),
      button: line('Button', 'For women riders'),
    },
    photos: {
      main: {
        label: 'Photo',
        photo: { src: '/images/bike-royal-enfield.webp', alt: 'Woman riding a motorcycle while her trainer walks beside her', focus: { d: { x: 50, y: 30 }, m: { x: 50, y: 30 } } },
        frames: [{ label: 'Computer', ratios: [0.6, 1], use: 'd' }, { label: 'Phone', ratios: [0.85, 1], use: 'm' }],
      },
    },
  },
  {
    id: 'how', label: 'How we train (4 steps)', movable: true,
    texts: {
      eyebrow: line('Section name', 'Why Zero Fear'),
      title: h('Headline', 'Confidence first. *Speed later.*'),
      lead: para('Text', 'No fixed formula. Your trainer starts from where you are and moves on only when you’re ready.'),
      s1t: line('Step 1 title', 'Start at your level'),
      s1: line('Step 1 text', 'Can’t ride a cycle? No problem. We begin with balance, feet down, at walking pace.'),
      s2t: line('Step 2 title', 'Build control'),
      s2: line('Step 2 text', 'Throttle, brakes and turns on a safe practice ground until they feel natural.'),
      s3t: line('Step 3 title', 'Ride on real roads'),
      s3: line('Step 3 text', 'Your trainer moves you to quiet roads first, then normal Kolkata traffic.'),
      s4t: line('Step 4 title', 'Ride on your own'),
      s4: line('Step 4 text', 'We fix weak spots and finish when you can ride confidently without help.'),
    },
    photos: {
      main: {
        label: 'Photo',
        photo: { src: '/images/how-it-works-briefing.webp', alt: 'Trainer explaining scooty controls to new learners before the first ride' },
        frames: [{ label: 'All screens', ratios: [1.5, 1.5], use: 'd' }],
      },
    },
  },
  {
    id: 'gallery', label: 'Training in action (photos)', movable: true,
    texts: {
      eyebrow: line('Section name', 'Training in action'),
      title: h('Headline', 'Real classes. *Real learners.*'),
      button: line('Button', 'See all photos'),
    },
  },
  {
    id: 'doorstep', label: 'Doorstep training', movable: true,
    texts: {
      eyebrow: line('Section name', 'Doorstep training'),
      title: h('Headline', 'Your lane. Your scooty. *Your trainer.*'),
      lead: para('Text', 'Learn near your home, on your own scooty if you like.'),
      areas: line('Areas label', 'Areas we often cover'),
      link: line('Link', 'How doorstep training works'),
    },
    photos: {
      main: {
        label: 'Photo',
        photo: { src: '/images/doorstep-lane-training.webp', alt: 'Trainer walking beside a learner on a quiet residential lane', focus: { d: { x: 50, y: 30 }, m: { x: 50, y: 30 } } },
        frames: [{ label: 'All screens', ratios: [1.25, 1.25], use: 'd' }],
      },
    },
  },
  {
    id: 'reviews', label: 'Reviews', movable: true,
    texts: {
      eyebrow: line('Section name', 'Reviews'),
      title: h('Headline', 'They were scared too. *Now they ride.*'),
    },
  },
  {
    id: 'mission', label: 'Our mission (slider)', movable: true,
    texts: {
      eyebrow: line('Section name', 'Our mission'),
      title: h('Headline', 'Fear Out. Freedom In.'),
      bn: line('Bengali line', 'নিজের প্রয়োজনে, নিজের মতো করে চলার স্বাধীনতা।'),
      c1t: line('Card 1 title', 'Learn'),
      c1: line('Card 1 text', 'Understand the scooty first: controls, posture and balance, at walking pace.'),
      c2t: line('Card 2 title', 'Practice'),
      c2: line('Card 2 text', 'Repeat start, stop and turns on a calm ground until they feel natural.'),
      c3t: line('Card 3 title', 'Experience'),
      c3: line('Card 3 text', 'Quiet lanes first, then real Kolkata traffic with your trainer beside you.'),
      c4t: line('Card 4 title', 'Freedom'),
      c4: line('Card 4 text', 'Ride to work, college or the market on your own. No waiting for anyone.'),
      button: line('Button', 'See more photos'),
    },
    photos: {
      c1: { label: 'Card 1 photo', photo: { src: '/images/gallery-trainer-explaining.webp', alt: 'Trainer explaining scooty controls' }, frames: [frames.tile, frames.tileM] },
      c2: { label: 'Card 2 photo', photo: { src: '/images/gallery-hands-on.webp', alt: 'Trainer guiding a learner’s hand on the throttle' }, frames: [frames.tile, frames.tileM] },
      c3: { label: 'Card 3 photo', photo: { src: '/images/gallery-any-age.webp', alt: 'Trainer walking beside a learner on a quiet lane' }, frames: [frames.tile, frames.tileM] },
      c4: { label: 'Card 4 photo', photo: { src: '/images/bike-first-ride.webp', alt: 'Learner on her first bike ride' }, frames: [frames.tile, frames.tileM] },
    },
  },
  {
    id: 'blog', label: 'Latest blog posts', movable: true,
    texts: {
      eyebrow: line('Section name', 'Riding tips & guides'),
      title: h('Headline', 'From our *blog.*'),
      button: line('Button', 'All articles'),
    },
  },
  {
    id: 'faq', label: 'FAQ', movable: true,
    texts: {
      eyebrow: line('Section name', 'FAQ'),
      title: h('Headline', 'Nervous? *Read this first.*'),
      lead: para('Text', 'Can’t find your answer? Call or WhatsApp us. We’re happy to help.'),
      link: line('Link', 'See all questions'),
    },
  },
  {
    id: 'contact', label: 'Contact & booking', movable: true,
    texts: {
      eyebrow: line('Section name', 'Contact'),
      title: h('Headline', 'Your first ride *starts here.*'),
      lead: para('Text', 'Tell us what you want to learn and when you’re free. We’ll call you back to fix a slot.'),
    },
  },
];

export const defaultOrder = sections.filter((s) => s.movable).map((s) => s.id);

// Hero headline placement. y = 0 (top of the photo) … 100 (bottom).
export type HeroLayout = { yD: number; yM: number; size: number; oneLine: boolean; align: 'left' | 'center' };
export const defaultHeroLayout: HeroLayout = { yD: 0, yM: 0, size: 1, oneLine: false, align: 'left' };

// "Training in action" photos. Shown on the home page and the /gallery page.
export const galleryFrames: Frame[] = [{ label: 'Home page tile', ratios: [1, 1.4], use: 'd' }];
export const defaultTrainingGallery: Photo[] = defaultGallery.map((g) => ({ src: g.src, alt: g.alt }));

// Business details editable in the admin panel.
export type Info = {
  phoneDisplay: string; phoneTel: string; whatsappDisplay: string; whatsappNumber: string;
  address: string; hours: string; instagram: string; facebook: string; youtube: string; googleReviewsUrl: string;
  stats: { value: string; label: string }[];
};

// Course fields editable in the admin panel (the long course-page text stays in code for now).
export type CourseEdit = { name?: string; level?: string; summary?: string; classes?: string; price?: number | null; photo?: Photo };
export const courseFrames: Frame[] = [
  { label: 'Home slider', ratios: [0.7, 0.85], use: 'd' },
  { label: 'Course card', ratios: [1.33, 1.33], use: 'd' },
  { label: 'Course page (phone)', ratios: [1.45, 1.45], use: 'm' },
];

// Stored content (one JSON document in Supabase).
export type Overrides = {
  texts?: Record<string, { value?: string; font?: FontKey; size?: number }>;
  photos?: Record<string, Photo>;
  order?: string[];
  hidden?: string[];
  hero?: Partial<HeroLayout>;
  gallery?: Photo[];
  info?: Partial<Info>;
  courses?: Record<string, CourseEdit>;
  blogFont?: FontKey;
  hiddenPosts?: string[]; // built-in (Markdown) posts removed in the admin panel
};

// Word and character limits for a field, from its default text.
export const words = (s: string) => s.replace(/\*/g, '').trim().split(/\s+/).filter(Boolean).length;
export const plain = (s: string) => s.replace(/\*/g, '');
export function limits(f: TextField) {
  const w = words(f.value);
  const c = plain(f.value).length;
  return { words: Math.max(w, 1), chars: Math.max(Math.ceil(c * 1.15), c + 4) };
}

// Blog limits
export const blogLimits = { title: 70, description: 160, sections: 10, heading: 70, sectionWords: 450, intro: 120, photos: 12 };
export const blogFrames: Frame[] = [
  { label: 'Blog card', ratios: [1.6, 1.6], use: 'd' },
  { label: 'Article top', ratios: [2, 2], use: 'd' },
];
