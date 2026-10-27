// Finds people and faces in a photo (runs in the browser, nothing is sent
// anywhere). Used to warn when a crop cuts a head or body.

import type { Person } from './geometry';
import type { Box } from '../cms/schema';

type Detector = {
  objects: { detect(img: HTMLImageElement): { detections: Det[] } };
  faces: { detect(img: HTMLImageElement): { detections: Det[] } };
};
type Det = { boundingBox?: { originX: number; originY: number; width: number; height: number }; categories: { categoryName: string; score: number }[] };

const MODELS = 'https://storage.googleapis.com/mediapipe-models';
let ready: Promise<Detector> | null = null;

function load(): Promise<Detector> {
  ready ??= (async () => {
    const { FilesetResolver, ObjectDetector, FaceDetector } = await import('@mediapipe/tasks-vision');
    const files = await FilesetResolver.forVisionTasks('/admin-assets/mediapipe');
    const objects = await ObjectDetector.createFromOptions(files, {
      baseOptions: { modelAssetPath: `${MODELS}/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite` },
      categoryAllowlist: ['person'], scoreThreshold: 0.35, maxResults: 12, runningMode: 'IMAGE',
    });
    const faces = await FaceDetector.createFromOptions(files, {
      baseOptions: { modelAssetPath: `${MODELS}/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite` },
      minDetectionConfidence: 0.45, runningMode: 'IMAGE',
    });
    return { objects, faces } as unknown as Detector;
  })();
  ready.catch(() => { ready = null; });
  return ready;
}

const pct = (d: Det, w: number, h: number): Box => {
  const b = d.boundingBox!;
  return { x: (b.originX / w) * 100, y: (b.originY / h) * 100, w: (b.width / w) * 100, h: (b.height / h) * 100 };
};
const inside = (a: Box, b: Box) => a.x + a.w / 2 > b.x && a.x + a.w / 2 < b.x + b.w && a.y + a.h / 2 > b.y && a.y + a.h / 2 < b.y + b.h;

export async function detectPeople(img: HTMLImageElement): Promise<Person[]> {
  const d = await load();
  const w = img.naturalWidth, h = img.naturalHeight;
  const bodies = d.objects.detect(img).detections.filter((x) => x.boundingBox).map((x) => pct(x, w, h));
  const faces = d.faces.detect(img).detections.filter((x) => x.boundingBox).map((x) => pct(x, w, h));
  if (!bodies.length) return [];
  const biggest = Math.max(...bodies.map((b) => b.w * b.h));
  return bodies
    .sort((a, b) => a.x - b.x)
    .map((box) => {
      const face = faces.find((f) => inside(f, box));
      // Head = the face plus hair/helmet above it; without a face, the top of the body.
      const head: Box = face
        ? { x: face.x - face.w * 0.25, y: face.y - face.h * 0.55, w: face.w * 1.5, h: face.h * 1.75 }
        : { x: box.x + box.w * 0.2, y: box.y, w: box.w * 0.6, h: Math.min(box.h * 0.2, box.w * 0.7) };
      const clamp = (b: Box): Box => {
        const x = Math.max(0, b.x), y = Math.max(0, b.y);
        return { x, y, w: Math.min(100, b.x + b.w) - x, h: Math.min(100, b.y + b.h) - y };
      };
      // Small people far in the background don't count unless switched on.
      return { box: clamp(box), head: clamp(head), on: box.w * box.h >= biggest * 0.2 };
    });
}
