import { useEffect, useState } from 'preact/hooks';
import { loadHistory, loadHistoryVersion, explain } from '../supabase';
import type { TabProps } from '../App';

export function HistoryTab({ edit }: TabProps) {
  const [history, setHistory] = useState<{ id: number; saved_at: string; saved_by: string | null }[] | null>(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { loadHistory().then(setHistory).catch((e) => setError(explain(e))); }, []);

  const restore = async (id: number, when: string) => {
    if (!confirm(`Load the version from ${new Date(when).toLocaleString('en-IN')}? Check it, then press Save to put it back on the website.`)) return;
    try {
      const data = await loadHistoryVersion(id);
      edit(() => data);
      setMsg('Older version loaded. Check it, then press Save at the top.');
    } catch (e) {
      setError(explain(e));
    }
  };

  return (
    <div class="panel">
      <h2 class="panel__title">History</h2>
      <p class="note">Every Save keeps the version before it (the last 50). Made a mistake? Load an older version and press Save.</p>
      {msg && <p class="ok">{msg}</p>}
      {error && <p class="error">{error}</p>}
      {history === null && !error && <p class="muted">Loading…</p>}
      {history?.length === 0 && <p class="muted">No earlier versions yet.</p>}
      {history && history.length > 0 && (
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

