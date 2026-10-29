import type { APIRoute } from 'astro';
import { readState } from '../../../../../lib/social/server';
import * as google from '../../../../../lib/social/google';
import * as meta from '../../../../../lib/social/meta';

// Google / Facebook send the owner back here after they allow access.
export const GET: APIRoute = async ({ url, params, redirect }) => {
  const back = (msg: string, ok: boolean) => redirect(`/admin?${new URLSearchParams({ [ok ? 'connected' : 'connect_error']: msg })}#social`);
  try {
    const state = readState(url.searchParams.get('state') ?? '');
    if (state.provider !== params.provider) throw new Error('Invalid connection link.');
    const code = url.searchParams.get('code');
    if (!code) return back(url.searchParams.get('error_description') ?? url.searchParams.get('error') ?? 'Access was not allowed.', false);
    const names = params.provider === 'google' ? await google.connect(code) : await meta.connect(code);
    if (!names.length) return back(params.provider === 'google' ? 'No Business Profile was found in this Google account.' : 'No Facebook page was found. Use the account that manages the page.', false);
    return back(names.join(', '), true);
  } catch (e) {
    console.error('[social] connect failed', e);
    return back(e instanceof Error ? e.message : String(e), false);
  }
};
