import { defineMiddleware } from 'astro:middleware';
import { refreshCms } from './cms';

// Load the latest admin-panel content before a page is rendered.
export const onRequest = defineMiddleware(async (_context, next) => {
  await refreshCms();
  return next();
});
