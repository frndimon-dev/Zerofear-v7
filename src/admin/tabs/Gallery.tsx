import { useState } from 'preact/hooks';
import { defaultTrainingGallery, galleryFrames, type Photo } from '../../cms/schema';
import { PhotoEditor } from '../PhotoEditor';
import { prepare } from '../images';
import { uploadImage, explain } from '../supabase';
import type { TabProps } from '../App';

export const MAX_GALLERY = 60;

// Uploads several photos at once (each as a large + small copy).
export async function uploadMany(files: FileList, name: string, onProgress: (text: string) => void): Promise<Photo[]> {
  const out: Photo[] = [];
  for (const [i, file] of [...files].entries()) {
    onProgress(`Uploading photo ${i + 1} of ${files.length}…`);
    const prep = await prepare(file);
    const src = await uploadImage(prep.big, name);
    const srcSm = await uploadImage(prep.small, `${name}-sm`);
    out.push({ src, srcSm, w: prep.w, h: prep.h, alt: 'Zero Fear scooty and bike training class in Kolkata' });
  }
  return out;
}

export function GalleryTab({ content, edit }: TabProps) {
  const list = content.gallery?.length ? content.gallery : defaultTrainingGallery;
  const [editing, setEditing] = useState<number | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const set = (next: Photo[]) => edit((c) => ({ ...c, gallery: next }));

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    if (list.length + files.length > MAX_GALLERY) { setError(`You can keep up to ${MAX_GALLERY} photos here. Remove some first.`); return; }
    setError('');
    try {
      const added = await uploadMany(files, 'training', setBusy);
      set([...added, ...list]);
    } catch (e) {
      setError(explain(e));
    } finally {
      setBusy('');
    }
  };
  const move = (i: number, d: -1 | 1) => {
    const next = [...list];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    set(next);
  };

  return (
    <div class="panel">
      <h2 class="panel__title">Training in action – photos</h2>
      <p class="note">The <b>first 7</b> photos show on the home page (the first one big). All photos show on the “Training in action” page, uncropped. Blog post photos are added there too automatically.</p>
      <div class="row">
        <label class="btn btn--primary">
          {busy || '+ Add photos'}
          <input type="file" accept="image/*" multiple hidden disabled={Boolean(busy)} onChange={(e) => add((e.currentTarget as HTMLInputElement).files)} />
        </label>
        <span class="muted">{list.length} photos · new photos go to the front</span>
      </div>
      {error && <p class="error">{error}</p>}
      <ul class="thumbs">
        {list.map((p, i) => (
          <li class={i < 7 ? 'is-home' : ''}>
            <img src={p.srcSm ?? p.src} alt={p.alt} style={{ objectPosition: `${p.focus?.d?.x ?? 50}% ${p.focus?.d?.y ?? 50}%` }} />
            {i < 7 && <span class="thumbs__tag">Home {i + 1}</span>}
            <div class="thumbs__ctrl">
              <button type="button" title="Move earlier" disabled={i === 0} onClick={() => move(i, -1)}>←</button>
              <button type="button" title="Move later" disabled={i === list.length - 1} onClick={() => move(i, 1)}>→</button>
              <button type="button" title="Adjust" onClick={() => setEditing(i)}>✎</button>
              <button type="button" title="Remove" onClick={() => confirm('Remove this photo from the site?') && set(list.filter((_, j) => j !== i))}>🗑</button>
            </div>
          </li>
        ))}
      </ul>
      {editing !== null && (
        <PhotoEditor title={`Photo ${editing + 1}`} photo={list[editing]} frames={galleryFrames} nameHint="training"
          onClose={() => setEditing(null)}
          onSave={(p) => { set(list.map((x, j) => (j === editing ? p : x))); setEditing(null); }} />
      )}
    </div>
  );
}
