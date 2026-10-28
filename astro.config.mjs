import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://zerofear.in',
  // Pages are rendered on the server (Hostinger Node.js hosting) with the
  // latest admin-panel content, so edits go live without a new deploy.
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [preact()], // preact: admin panel only
});
