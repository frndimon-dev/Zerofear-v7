// Crop maths for the photo editor. Everything is in % of the image (0–100),
// matching CSS object-fit: cover + object-position.

import type { Box, Frame, Pt } from '../cms/schema';

export type Person = { box: Box; head: Box; on: boolean };
export type Issue = { level: 'bad' | 'warn'; text: string };

// Visible part of the image when shown in a box of width/height `ratio`.
export function visibleArea(imgW: number, imgH: number, ratio: number, pos: Pt): Box {
  const imgRatio = imgW / imgH;
  if (imgRatio > ratio) {
    const w = (ratio / imgRatio) * 100;
    return { x: (100 - w) * (pos.x / 100), y: 0, w, h: 100 };
  }
  const h = (imgRatio / ratio) * 100;
  return { x: 0, y: (100 - h) * (pos.y / 100), w: 100, h };
}

const intersect = (a: Box, b: Box) => {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const w = Math.min(a.x + a.w, b.x + b.w) - x;
  const h = Math.min(a.y + a.h, b.y + b.h) - y;
  return w > 0 && h > 0 ? w * h : 0;
};
const shown = (box: Box, view: Box) => intersect(box, view) / Math.max(box.w * box.h, 0.0001);

export const union = (boxes: Box[]): Box | null => {
  if (!boxes.length) return null;
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const r = Math.max(...boxes.map((b) => b.x + b.w));
  const bt = Math.max(...boxes.map((b) => b.y + b.h));
  return { x, y, w: r - x, h: bt - y };
};

// What gets cut in one view.
export function checkView(view: Box, people: Person[], keep: Box | null): Issue[] {
  const issues: Issue[] = [];
  const on = people.filter((p) => p.on);
  const headsCut = on.filter((p) => shown(p.head, view) < 0.97).length;
  const bodiesCut = on.filter((p) => shown(p.box, view) < 0.8).length;
  if (headsCut) issues.push({ level: 'bad', text: headsCut === 1 ? 'A head/face is cut' : `${headsCut} heads/faces are cut` });
  if (keep && shown(keep, view) < 0.97) issues.push({ level: 'bad', text: 'Your marked area is cut' });
  if (!headsCut && bodiesCut) issues.push({ level: 'warn', text: bodiesCut === 1 ? 'Part of a person’s body is cut' : `${bodiesCut} people are partly cut` });
  return issues;
}

// Best crop position for the frames that use `which` (d or m).
export function autoFocus(size: { w: number; h: number }, frames: Frame[], which: 'd' | 'm', people: Person[], keep: Box | null): Pt {
  const fs = frames.filter((f) => f.use === which);
  if (!fs.length) return { x: 50, y: 50 };
  const imgRatio = size.w / size.h;
  // Tightest crop in each direction.
  const minW = Math.min(...fs.map((f) => (Math.min(f.ratios[0], imgRatio) / imgRatio) * 100));
  const minH = Math.min(...fs.map((f) => (Math.min(imgRatio / f.ratios[1], 1)) * 100));
  const on = people.filter((p) => p.on);
  const must = union([...on.map((p) => p.head), ...(keep ? [keep] : [])]);
  const bodies = union([...on.map((p) => p.box), ...(keep ? [keep] : [])]);
  if (!must || !bodies) return { x: 50, y: 50 };

  const axis = (start: number, len: number, mustStart: number, mustLen: number, visible: number, vertical: boolean) => {
    if (visible >= 99.9) return 50;
    // Fit the whole group if it fits. Otherwise keep the heads: centred
    // sideways, and with a little space above them vertically.
    let from = start + len / 2 - visible / 2;
    if (len > visible) from = vertical ? Math.max(mustStart - 4, mustStart + mustLen - visible) : mustStart + mustLen / 2 - visible / 2;
    if (mustLen > visible) from = mustStart + mustLen / 2 - visible / 2;
    return Math.round(Math.min(100, Math.max(0, (from / (100 - visible)) * 100)));
  };
  return {
    x: axis(bodies.x, bodies.w, must.x, must.w, minW, false),
    y: axis(bodies.y, bodies.h, must.y, must.h, minH, true),
  };
}
