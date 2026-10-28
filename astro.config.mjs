import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import vercel from '@astrojs/vercel';

export default defineConfig({
  // Update to the real domain (e.g. https://zerofear.in) once it is bought.
  site: 'https://zerofear-v7.vercel.app',
  // Pages are rendered on the server with the latest admin-panel content and
  // cached by Vercel for 60 seconds, so edits go live without a new deploy.
  output: 'server',
  adapter: vercel({ isr: { expiration: 60 } }),
  integrations: [preact()], // preact: admin panel only
});
