// Copies the face/person detection runtime (used only by the admin panel's
// photo editor) into public/, so it is served from our own site.
import { cpSync, mkdirSync } from 'node:fs';

const from = 'node_modules/@mediapipe/tasks-vision/wasm';
const to = 'public/admin-assets/mediapipe';
mkdirSync(to, { recursive: true });
for (const f of ['vision_wasm_internal.js', 'vision_wasm_internal.wasm', 'vision_wasm_nosimd_internal.js', 'vision_wasm_nosimd_internal.wasm']) {
  cpSync(`${from}/${f}`, `${to}/${f}`);
}
