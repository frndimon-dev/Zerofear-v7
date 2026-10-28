// Hostinger's Node.js hosting looks for the entry file "dist/server/entry.mjs",
// sometimes from the project folder and sometimes from inside the output
// folder (dist). This adds dist/dist/server/entry.mjs, which just starts the
// real server, so the same setting works either way.
import { mkdirSync, writeFileSync } from 'node:fs';

mkdirSync('dist/dist/server', { recursive: true });
writeFileSync('dist/dist/server/entry.mjs', "import '../../server/entry.mjs';\n");
