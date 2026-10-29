import { useEffect, useState } from 'preact/hooks';
import type { Session } from '@supabase/supabase-js';
import type { Overrides } from '../cms/schema';
import { sb, explain, loadContent, saveContent } from './supabase';
import { SectionsTab } from './tabs/Sections';
import { GalleryTab } from './tabs/Gallery';
import { CoursesTab } from './tabs/Courses';
import { InfoTab } from './tabs/Info';
import { BlogTab } from './tabs/Blog';
import { HistoryTab } from './tabs/History';
import { SocialTab } from './tabs/Social';

export type Edit = (fn: (c: Overrides) => Overrides) => void;
export type TabProps = { content: Overrides; edit: Edit; email: string; saveNow: () => Promise<boolean> };

const tabs = [
  { id: 'home', label: 'Home page', C: SectionsTab },
  { id: 'gallery', label: 'Photos', C: GalleryTab },
  { id: 'courses', label: 'Courses & prices', C: CoursesTab },
  { id: 'info', label: 'Contact & numbers', C: InfoTab },
  { id: 'blog', label: 'Blog', C: BlogTab },
  { id: 'social', label: 'Social', C: SocialTab },
  { id: 'history', label: 'History', C: HistoryTab },
] as const;

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  if (session === undefined) return <div class="center muted">Loading…</div>;
  if (!session) return <Login />;
  return <Editor email={session.user.email ?? ''} />;
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const submit = async (e: Event) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await sb.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError(explain(error));
  };
  const reset = async () => {
    if (!email) { setError('Type your e-mail first.'); return; }
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/admin` });
    if (error) setError(explain(error)); else setSent(true);
  };
  return (
    <form class="login" onSubmit={submit}>
      <div class="login__logo">ZERO <span>FEAR</span></div>
      <h1>Admin panel</h1>
      <label class="field"><span class="field__label">E-mail</span><input class="input" type="email" autoComplete="username" required value={email} onInput={(e) => setEmail((e.currentTarget as HTMLInputElement).value)} /></label>
      <label class="field"><span class="field__label">Password</span><input class="input" type="password" autoComplete="current-password" required value={password} onInput={(e) => setPassword((e.currentTarget as HTMLInputElement).value)} /></label>
      {error && <p class="error">{error}</p>}
      {sent && <p class="ok">Check your e-mail for a link to set a new password.</p>}
      <button class="btn btn--primary btn--block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      <button type="button" class="link" onClick={reset}>Forgot password?</button>
    </form>
  );
}

function Editor({ email }: { email: string }) {
  const [content, setContent] = useState<Overrides | null>(null);
  const [savedJson, setSavedJson] = useState('{}');
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState<(typeof tabs)[number]['id']>(() => (location.hash.slice(1) as never) || 'home');
  const [status, setStatus] = useState<{ kind: 'ok' | 'error' | 'info'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadContent()
      .then(({ data }) => { setContent(data); setSavedJson(JSON.stringify(data)); })
      .catch((e) => setLoadError(explain(e)));
  }, []);
  useEffect(() => { history.replaceState(null, '', `#${tab}`); }, [tab]);

  const dirty = content !== null && JSON.stringify(content) !== savedJson;
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    addEventListener('beforeunload', warn);
    return () => removeEventListener('beforeunload', warn);
  }, [dirty]);

  if (loadError) return <div class="center"><p class="error">{loadError}</p><button class="btn btn--light" onClick={() => sb.auth.signOut()}>Sign out</button></div>;
  if (!content) return <div class="center muted">Loading your website content…</div>;

  const edit: Edit = (fn) => setContent((c) => fn(structuredClone(c ?? {})));

  const saveNow = async () => {
    if (!dirty) return true;
    setBusy(true);
    try {
      await saveContent(content, email);
      setSavedJson(JSON.stringify(content));
      setStatus({ kind: 'ok', text: 'Saved. The website will show it within about 2 minutes.' });
      return true;
    } catch (e) {
      setStatus({ kind: 'error', text: explain(e) });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const Current = tabs.find((t) => t.id === tab)!.C;
  return (
    <div class="app">
      <header class="bar">
        <div class="bar__logo">ZERO <span>FEAR</span> <small>Admin</small></div>
        <nav class="bar__tabs">
          {tabs.map((t) => <button type="button" class={`tab ${t.id === tab ? 'is-active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
        </nav>
        <div class="bar__actions">
          <span class={`dot ${dirty ? 'dot--dirty' : ''}`}>{dirty ? 'Unsaved changes' : 'All saved'}</span>
          <button type="button" class="btn btn--primary" disabled={!dirty || busy} onClick={saveNow}>{busy ? 'Saving…' : 'Save'}</button>
          <a class="btn btn--ghost" href="/" target="_blank" rel="noopener">View site</a>
          <button type="button" class="btn btn--ghost" onClick={() => { if (!dirty || confirm('You have unsaved changes. Sign out anyway?')) sb.auth.signOut(); }}>Sign out</button>
        </div>
      </header>
      {status && (
        <div class={`toast toast--${status.kind}`} role="status">
          {status.text}
          <button type="button" class="link" onClick={() => setStatus(null)}>OK</button>
        </div>
      )}
      <main class="main">
        <Current content={content} edit={edit} email={email} saveNow={saveNow} />
      </main>
    </div>
  );
}
