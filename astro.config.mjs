import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // Update to the real domain (e.g. https://zerofear.in) once it is bought.
  site: 'https://zerofear-v7.vercel.app',
  output: 'static',
  integrations: [sitemap({ filter: (page) => !page.includes('/404') })],
});
