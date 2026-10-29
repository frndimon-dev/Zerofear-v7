import { defineMiddleware } from 'astro:middleware';
import { refreshCms } from './cms';
import { startScheduler } from './lib/social/tick';

// Load the latest admin-panel content before a page is rendered, and keep the
// social scheduler running (it does nothing until its secrets are set).
export const onRequest = defineMiddleware(async (context, next) => {
  startScheduler();
  if (!context.url.pathname.startsWith('/api/')) await refreshCms();
  return next();
});
