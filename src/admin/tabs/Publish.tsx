import { useEffect, useState } from 'preact/hooks';
import { getSetting, setSetting, loadHistory, loadHistoryVersion, explain } from '../supabase';
import { Field } from '../ui';
import type { TabProps } from '../App';

export function PublishTab({ edit }: TabProps) {
  const [hook, setHook] = useState('');
  const [hasHook, setHasHook] = useState(false);
  const [last, setLast] = useState<string | null>(null);
  const [history, setHistory] = useState<{ id: number; saved_at: string; saved_by: string | null }[]>([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getSetting('deploy_hook').then((v) => setHasHook(Boolean(v))).catch((e) => setError(explain(e)));
    getSetting('last_publish').then(setLast).catch(() => {});
    loadHistory().then(setHistory).catch(() => {});
  }, []);

  const saveHook = async () => {
    if (!/^https:\/\/api\.vercel\.com\/v1\/integrations\/deploy\//.test(hook.trim())) {
      setError('That doesn’t look like a Vercel deploy hook. It starts with https://api.vercel.com/v1/integrations/deploy/');
      return;
    }
    try {
      await setSetting('deploy_hook', hook.trim());
      setHasHook(true);
      setHook('');
      setError('');
      setMsg('Publishing is connected.');
    } catch (e) {
      setError(explain(e));
    }
  };

  const restore = async (id: number, when: string) => {
    if (!confirm(`Load the version saved on ${new Date(when).toLocaleString('en-IN')}? You can check it, then Save and Publish.`)) return;
    try {
      const data = await loadHistoryVersion(id);
      edit(() => data);
      setMsg('Older version loaded. Check it, then press Save (and Publish) at the top.');
    } catch (e) {
      setError(explain(e));
    }
  };

  return (
    <div class="panel">
      <h2 class="panel__title">Publish & history</h2>
      <p class="note">
        <b>Save</b> keeps your changes safely. <b>Publish</b> rebuilds the website with everything saved; it takes about 1–2 minutes.
        {last && <> Last published: {new Date(last).toLocaleString('en-IN')}.</>}
      </p>
      {msg && <p class="ok">{msg}</p>}
      {error && <p class="error">{error}</p>}

      <h3>Connect publishing {hasHook ? <span class="badge badge--ok">✓ Connected</span> : <span class="badge badge--bad">Not connected</span>}</h3>
      <ol class="steps">
        <li>Open Vercel → project <b>zerofear-v7</b> → Settings → Git → <b>Deploy Hooks</b>.</li>
        <li>Name: <code>admin</code>, branch: the branch the live site uses (usually <code>main</code>) → Create Hook.</li>
        <li>Copy the link and paste it here.</li>
      </ol>
      <div class="row">
        <Field label={hasHook ? 'Replace deploy hook' : 'Deploy hook link'}>
          <input class="input" type="url" placeholder="https://api.vercel.com/v1/integrations/deploy/…" value={hook} onInput={(e) => setHook((e.currentTarget as HTMLInputElement).value)} />
        </Field>
        <button type="button" class="btn btn--light" disabled={!hook} onClick={saveHook}>Save link</button>
      </div>

      <h3>Earlier versions</h3>
      <p class="muted">Every Save keeps the previous version (last 50). Made a mistake? Load an older one.</p>
      {history.length === 0 ? <p class="muted">No earlier versions yet.</p> : (
        <ul class="history">
          {history.map((h) => (
            <li>
              <span>{new Date(h.saved_at).toLocaleString('en-IN')}{h.saved_by && <span class="muted"> · {h.saved_by}</span>}</span>
              <button type="button" class="btn btn--ghost" onClick={() => restore(h.id, h.saved_at)}>Load this version</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
