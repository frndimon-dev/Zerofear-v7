import { useEffect, useRef, useState } from 'preact/hooks';
import type { PostRow } from '../../lib/blog';
import { blogFrames, blogLimits as LIM, words, type Photo } from '../../cms/schema';
import { fonts, type FontKey } from '../../cms/fonts';
import { loadPosts, savePost, deletePost, explain } from '../supabase';
import { PhotoEditor } from '../PhotoEditor';
import { uploadMany } from './Gallery';
import { slugify } from '../images';
import { Field, FontPicker, LimitedText } from '../ui';
import type { TabProps } from '../App';

const CATEGORIES = ['Guide', 'Area', 'Safety', 'Women', 'Bike', 'RTO'];

// Built-in posts (Markdown files), published by the site at /admin/posts.json.
type BuiltIn = PostRow & { builtIn: true };

type Section = { heading: string; text: string };
type Draft = {
  slug: string; title: string; description: string; category: string; date: string; keywords: string;
  headingFont?: FontKey; cover: Photo | null; gallery: Photo[]; intro: string; sections: Section[]; draft: boolean;
  isNew: boolean; builtIn: boolean;
};

function split(body: string): { intro: string; sections: Section[] } {
  const parts = body.split(/^## +/m);
  const intro = parts.shift()!.trim();
  return { intro, sections: parts.map((p) => { const [h, ...rest] = p.split('\n'); return { heading: h.trim(), text: rest.join('\n').trim() }; }) };
}
const join = (d: Draft) => [d.intro.trim(), ...d.sections.filter((s) => s.heading.trim() || s.text.trim()).map((s) => `## ${s.heading.trim()}\n\n${s.text.trim()}`)].filter(Boolean).join('\n\n') + '\n';

const toDraft = (r: PostRow, builtIn: boolean): Draft => ({
  slug: r.slug, title: r.title, description: r.description, category: r.category, date: r.date.slice(0, 10),
  keywords: (r.keywords ?? []).join(', '), headingFont: (r.heading_font as FontKey) ?? undefined,
  cover: r.cover, gallery: r.gallery ?? [], ...split(r.body ?? ''), draft: r.draft, isNew: false, builtIn,
});

export function BlogTab({ content, edit }: TabProps) {
  const [rows, setRows] = useState<PostRow[] | null>(null);
  const [builtIn, setBuiltIn] = useState<BuiltIn[]>([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Draft | null>(null);
  const hidden = new Set(content.hiddenPosts ?? []);

  const refresh = () => loadPosts().then(setRows).catch((e) => setError(explain(e)));
  useEffect(() => {
    refresh();
    fetch('/admin/posts.json').then((r) => r.json()).then(setBuiltIn).catch(() => setError('Could not load the built-in posts.'));
  }, []);

  if (editing) return <PostEditor initial={editing} content={content} taken={new Set([...(rows ?? []).map((r) => r.slug), ...builtIn.map((b) => b.slug)])}
    onClose={() => { setEditing(null); refresh(); }} />;

  const saved = new Map((rows ?? []).map((r) => [r.slug, r]));
  const all = [...(rows ?? []), ...builtIn.filter((b) => !saved.has(b.slug))].sort((a, b) => b.date.localeCompare(a.date));
  const toggleHidden = (slug: string) => edit((c) => {
    const h = new Set(c.hiddenPosts ?? []);
    h.has(slug) ? h.delete(slug) : h.add(slug);
    return { ...c, hiddenPosts: [...h] };
  });
  const blank: Draft = {
    slug: '', title: '', description: '', category: 'Guide', date: new Date().toISOString().slice(0, 10), keywords: '',
    cover: null, gallery: [], intro: '', sections: [{ heading: '', text: '' }], draft: true, isNew: true, builtIn: false,
  };

  return (
    <div class="panel">
      <div class="row row--between">
        <h2 class="panel__title">Blog</h2>
        <button type="button" class="btn btn--primary" onClick={() => setEditing(blank)}>+ New post</button>
      </div>
      <div class="grid2">
        <Field label="Headline font for all blog posts" hint="Each post can also choose its own font.">
          <FontPicker value={content.blogFont} def="bricolage" sample="Scooty training in Tollygunge" onChange={(f) => edit((c) => ({ ...c, blogFont: f === 'bricolage' ? undefined : f }))} />
        </Field>
      </div>
      {error && <p class="error">{error}</p>}
      {!rows && !error && <p class="muted">Loading posts…</p>}
      <ul class="posts">
        {all.map((r) => {
          const isBuilt = !saved.has(r.slug);
          const isHidden = hidden.has(r.slug);
          return (
            <li class={isHidden ? 'is-hidden' : ''}>
              {r.cover && <img src={r.cover.srcSm ?? r.cover.src} alt="" />}
              <div class="posts__body">
                <strong>{r.title}</strong>
                <span class="muted">/blog/{r.slug} · {r.date.slice(0, 10)} · {r.category}</span>
                <span>
                  {r.draft && !isBuilt && <span class="badge badge--warn">Draft (not on the site)</span>}
                  {isHidden && <span class="badge badge--bad">Hidden</span>}
                  {!r.draft && !isHidden && <span class="badge badge--ok">On the site</span>}
                </span>
              </div>
              <div class="posts__ctrl">
                <button type="button" class="btn btn--light" onClick={() => setEditing(toDraft(r, isBuilt))}>Edit</button>
                <button type="button" class="btn btn--ghost" onClick={() => toggleHidden(r.slug)}>{isHidden ? 'Show' : 'Hide'}</button>
                {!isBuilt && !builtIn.some((b) => b.slug === r.slug) && (
                  <button type="button" class="btn btn--ghost" onClick={async () => {
                    if (!confirm(`Delete “${r.title}” for good?`)) return;
                    try { await deletePost(r.slug); refresh(); } catch (e) { setError(explain(e)); }
                  }}>Delete</button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p class="muted">Hiding or showing a post takes effect after Save and Publish. Saving a post itself is immediate; it shows on the site after Publish.</p>
    </div>
  );
}

function PostEditor({ initial, content, taken, onClose }: { initial: Draft; content: TabProps['content']; taken: Set<string>; onClose: () => void }) {
  const [d, setD] = useState<Draft>(initial);
  const [photo, setPhoto] = useState<'cover' | number | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [savedOnce, setSavedOnce] = useState(false);
  const set = (patch: Partial<Draft>) => setD((cur) => ({ ...cur, ...patch }));
  const setSection = (i: number, patch: Partial<Section>) => set({ sections: d.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const slug = d.isNew ? slugify(d.slug || d.title) : d.slug;
  const defFont = content.blogFont ?? 'bricolage';

  const problems = [
    !d.title.trim() && 'Add a title.',
    !slug && 'Add a title so the post gets a web address.',
    d.isNew && taken.has(slug) && 'A post with this web address already exists. Change the title or the address.',
    !d.cover && 'Add a cover photo.',
    d.description.trim().length < 50 && 'Write a description of at least 50 letters (Google shows it under the title).',
    d.sections.some((s) => s.text.trim() && !s.heading.trim()) && 'Every section needs a heading.',
  ].filter(Boolean) as string[];

  const save = async (publish: boolean) => {
    if (publish && problems.length) { setError(problems[0]); return; }
    if (!d.title.trim() || !slug) { setError('Add a title first.'); return; }
    if (d.isNew && taken.has(slug) && !savedOnce) { setError(problems.find((p) => p.includes('exists'))!); return; }
    setError('');
    setBusy('Saving…');
    try {
      const row: PostRow = {
        slug, title: d.title.trim(), description: d.description.trim(), category: d.category, body: join(d),
        cover: d.cover, gallery: d.gallery, keywords: d.keywords.split(',').map((k) => k.trim()).filter(Boolean),
        heading_font: d.headingFont && d.headingFont !== defFont ? d.headingFont : null,
        date: d.date, updated_at: d.isNew ? null : new Date().toISOString(), draft: !publish,
      };
      await savePost(row);
      set({ draft: !publish, isNew: false, slug });
      setSavedOnce(true);
      setBusy(publish ? 'Saved. Press “Publish” at the top to update the website.' : 'Saved as draft.');
      setTimeout(() => setBusy(''), 2500);
    } catch (e) {
      setError(explain(e));
      setBusy('');
    }
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    if (d.gallery.length + files.length > LIM.photos) { setError(`Up to ${LIM.photos} photos per post.`); return; }
    try {
      const added = await uploadMany(files, slug || 'blog', setBusy);
      set({ gallery: [...d.gallery, ...added.map((p) => ({ ...p, alt: d.title ? `${d.title} – class photo` : p.alt }))] });
    } catch (e) {
      setError(explain(e));
    } finally {
      setBusy('');
    }
  };

  return (
    <div class="panel post-editor">
      <div class="row row--between">
        <button type="button" class="link" onClick={() => (!savedOnce && JSON.stringify(d) !== JSON.stringify(initial) && !confirm('Leave without saving?') ? null : onClose())}>← All posts</button>
        <div class="row">
          {busy && <span class="muted">{busy}</span>}
          <button type="button" class="btn btn--light" disabled={Boolean(busy)} onClick={() => save(false)}>Save as draft</button>
          <button type="button" class="btn btn--primary" disabled={Boolean(busy)} onClick={() => save(true)}>Save & put on site</button>
        </div>
      </div>
      {initial.builtIn && <p class="note">This is one of the first articles. Saving here creates an editable copy that replaces it on the site.</p>}
      {error && <p class="error">{error}</p>}

      <div class="post-editor__grid">
        <div>
          <Field label={`Title (max ${LIM.title} letters)`} hint="Put the search words people use near the start, e.g. “Scooty Training in Behala: …”">
            <LimitedText value={d.title} maxWords={14} maxChars={LIM.title} onChange={(v) => set({ title: v })} />
          </Field>
          {d.isNew && (
            <Field label="Web address" hint={`zerofear…/blog/${slug || '…'}`}>
              <input class="input" value={d.slug || slugify(d.title)} onInput={(e) => set({ slug: slugify((e.currentTarget as HTMLInputElement).value) })} />
            </Field>
          )}
          <Field label={`Description (max ${LIM.description} letters)`} hint="Shown by Google under the title, and at the top of the post.">
            <LimitedText value={d.description} maxWords={35} maxChars={LIM.description} onChange={(v) => set({ description: v })} />
          </Field>
          <div class="grid3">
            <Field label="Topic">
              <select class="input" value={d.category} onChange={(e) => set({ category: (e.currentTarget as HTMLSelectElement).value })}>
                {CATEGORIES.map((c) => <option>{c}</option>)}
              </select>
            </Field>
            <Field label="Date"><input class="input" type="date" value={d.date} onInput={(e) => set({ date: (e.currentTarget as HTMLInputElement).value })} /></Field>
            <Field label="Search words (comma separated)"><input class="input" value={d.keywords} maxLength={300} onInput={(e) => set({ keywords: (e.currentTarget as HTMLInputElement).value })} /></Field>
          </div>
          <Field label="Headline font for this post">
            <FontPicker value={d.headingFont} def={defFont} sample={d.title || 'Your post title'} onChange={(f) => set({ headingFont: f })} />
          </Field>

          <Field label={`Opening paragraph (max ${LIM.intro} words)`}>
            <TextBox value={d.intro} max={LIM.intro} onChange={(v) => set({ intro: v })} />
          </Field>
          <h3>Sections ({d.sections.length}/{LIM.sections})</h3>
          {d.sections.map((s, i) => (
            <div class="section-edit">
              <div class="row row--between">
                <strong>Section {i + 1}</strong>
                <span class="list__ctrl">
                  <button type="button" disabled={i === 0} onClick={() => { const a = [...d.sections]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; set({ sections: a }); }}>↑</button>
                  <button type="button" disabled={i === d.sections.length - 1} onClick={() => { const a = [...d.sections]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; set({ sections: a }); }}>↓</button>
                  <button type="button" onClick={() => confirm('Remove this section?') && set({ sections: d.sections.filter((_, j) => j !== i) })}>🗑</button>
                </span>
              </div>
              <Field label={`Heading (max ${LIM.heading} letters)`}>
                <LimitedText value={s.heading} maxWords={14} maxChars={LIM.heading} onChange={(v) => setSection(i, { heading: v })} />
              </Field>
              <Field label={`Text (max ${LIM.sectionWords} words)`}>
                <TextBox value={s.text} max={LIM.sectionWords} onChange={(v) => setSection(i, { text: v })} />
              </Field>
            </div>
          ))}
          {d.sections.length < LIM.sections
            ? <button type="button" class="btn btn--light" onClick={() => set({ sections: [...d.sections, { heading: '', text: '' }] })}>+ Add section</button>
            : <p class="muted">Maximum {LIM.sections} sections per post.</p>}
        </div>

        <aside>
          <div class="google">
            <span class="muted">How it may look on Google</span>
            <span class="google__url">zerofear… › blog › {slug || '…'}</span>
            <span class="google__title" style={{ fontFamily: fonts.manrope.css }}>{d.title || 'Post title'}</span>
            <span class="google__desc">{d.description || 'Description…'}</span>
          </div>
          <h3>Cover photo</h3>
          {d.cover
            ? <img class="cover" src={d.cover.srcSm ?? d.cover.src} alt="" style={{ objectPosition: `${d.cover.focus?.d?.x ?? 50}% ${d.cover.focus?.d?.y ?? 50}%` }} />
            : <p class="muted">No cover photo yet.</p>}
          <button type="button" class="btn btn--light" onClick={() => setPhoto('cover')}>{d.cover ? 'Change / adjust cover' : 'Add cover photo'}</button>

          <h3>More photos ({d.gallery.length}/{LIM.photos})</h3>
          <p class="muted">Shown as a swipeable strip at the end of the post, and on the “Training in action” page.</p>
          <ul class="thumbs thumbs--small">
            {d.gallery.map((g, i) => (
              <li>
                <img src={g.srcSm ?? g.src} alt={g.alt} />
                <div class="thumbs__ctrl">
                  <button type="button" disabled={i === 0} onClick={() => { const a = [...d.gallery]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; set({ gallery: a }); }}>←</button>
                  <button type="button" onClick={() => setPhoto(i)}>✎</button>
                  <button type="button" onClick={() => set({ gallery: d.gallery.filter((_, j) => j !== i) })}>🗑</button>
                </div>
              </li>
            ))}
          </ul>
          {d.gallery.length < LIM.photos && (
            <label class="btn btn--light">+ Add photos<input type="file" accept="image/*" multiple hidden onChange={(e) => addPhotos((e.currentTarget as HTMLInputElement).files)} /></label>
          )}
          {problems.length > 0 && <ul class="todo">{problems.map((p) => <li>{p}</li>)}</ul>}
        </aside>
      </div>

      {photo !== null && (
        <PhotoEditor
          title={photo === 'cover' ? 'Cover photo' : `Photo ${photo + 1}`}
          photo={photo === 'cover' ? d.cover ?? { src: '/og.png', alt: d.title } : d.gallery[photo]}
          frames={photo === 'cover' ? blogFrames : [{ label: 'Photo strip', ratios: [1.33, 1.33], use: 'd' }]}
          nameHint={slug || 'blog'}
          onClose={() => setPhoto(null)}
          onSave={(p) => { if (photo === 'cover') set({ cover: p }); else set({ gallery: d.gallery.map((g, j) => (j === photo ? p : g)) }); setPhoto(null); }}
        />
      )}
    </div>
  );
}

// Plain text box with Bold / List / Link buttons (writes simple Markdown).
function TextBox({ value, max, onChange }: { value: string; max: number; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const wrap = (before: string, after = '', placeholder = 'text') => {
    const el = ref.current!;
    const { selectionStart: a, selectionEnd: b } = el;
    const sel = value.slice(a, b) || placeholder;
    const next = value.slice(0, a) + before + sel + after + value.slice(b);
    if (words(next) <= max) onChange(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + before.length, a + before.length + sel.length); });
  };
  const list = () => {
    const el = ref.current!;
    const a = value.lastIndexOf('\n', el.selectionStart - 1) + 1;
    onChange(value.slice(0, a) + '- ' + value.slice(a));
  };
  return (
    <div class="textbox">
      <div class="textbox__tools">
        <button type="button" onClick={() => wrap('**', '**')}><b>B</b> Bold</button>
        <button type="button" onClick={list}>• List</button>
        <button type="button" onClick={() => { const url = prompt('Link address (e.g. /courses/basic-scooty-training or https://…)'); if (url) wrap('[', `](${url})`, 'link text'); }}>🔗 Link</button>
        <span class={`muted ${words(value) >= max ? 'is-full' : ''}`}>{words(value)}/{max} words</span>
      </div>
      <textarea ref={ref} class="input" rows={6} value={value} onInput={(e) => {
        const el = e.currentTarget as HTMLTextAreaElement;
        if (words(el.value) > max) { el.value = value; return; }
        onChange(el.value);
      }} />
    </div>
  );
}
