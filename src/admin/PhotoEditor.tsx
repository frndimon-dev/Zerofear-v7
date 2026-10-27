import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Box, Frame, Photo, Pt } from '../cms/schema';
import { autoFocus, checkView, visibleArea, type Issue, type Person } from './geometry';
import { detectPeople } from './detect';
import { prepare, loadImage, slugify, type Prepared } from './images';
import { uploadImage, explain } from './supabase';
import { Field, Modal } from './ui';

type Props = {
  title: string;
  photo: Photo;
  frames: Frame[];
  nameHint: string;
  allowMobile?: boolean; // hero: a different photo can be used on phones
  minWidth?: number; // warn below this width (px)
  onSave: (p: Photo) => void;
  onClose: () => void;
};

type View = { key: string; frame: Frame; ratio: number; mobile: boolean };

export function PhotoEditor({ title, photo, frames, nameHint, allowMobile, minWidth = 1000, onSave, onClose }: Props) {
  const [p, setP] = useState<Photo>({ ...photo, focus: { ...photo.focus } });
  const [pending, setPending] = useState<{ main?: Prepared; mobile?: Prepared }>({});
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [imgM, setImgM] = useState<HTMLImageElement | null>(null);
  const [people, setPeople] = useState<Person[]>(photo.people ?? []);
  const [peopleM, setPeopleM] = useState<Person[]>(photo.peopleM ?? []);
  const [keep, setKeep] = useState<Box | null>(photo.keep?.[0] ?? null);
  const [detect, setDetect] = useState<'idle' | 'running' | 'failed' | 'done'>(photo.people ? 'done' : 'idle');
  const [mark, setMark] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const mainSrc = pending.main?.url ?? p.src;
  const mobileSrc = pending.mobile?.url ?? p.mobileSrc;
  const hasMobile = Boolean(allowMobile && mobileSrc);

  // Load the photo(s) and find the people in them.
  useEffect(() => {
    let live = true;
    setImg(null);
    loadImage(mainSrc).then(async (el) => {
      if (!live) return;
      setImg(el);
      if (photo.people && !pending.main) return;
      setDetect('running');
      try {
        const found = await detectPeople(el);
        if (!live) return;
        setPeople(found);
        setDetect('done');
        if (pending.main) fit(el, found, keep, 'both');
      } catch {
        if (live) setDetect('failed');
      }
    }).catch((e) => setError(explain(e)));
    return () => { live = false; };
  }, [mainSrc]);

  useEffect(() => {
    let live = true;
    if (!hasMobile || !mobileSrc) { setImgM(null); return; }
    loadImage(mobileSrc).then(async (el) => {
      if (!live) return;
      setImgM(el);
      if (photo.peopleM && !pending.mobile) return;
      try {
        const found = await detectPeople(el);
        if (live) { setPeopleM(found); if (pending.mobile) fitMobile(el, found); }
      } catch { /* the main photo's status already shows detection problems */ }
    }).catch((e) => setError(explain(e)));
    return () => { live = false; };
  }, [mobileSrc, hasMobile]);

  const size = (el: HTMLImageElement | null) => ({ w: el?.naturalWidth || 1, h: el?.naturalHeight || 1 });

  function fit(el: HTMLImageElement, ppl: Person[], k: Box | null, which: 'both' | 'd' | 'm') {
    const s = size(el);
    setP((cur) => {
      const focus = { ...cur.focus };
      if (which !== 'm') focus.d = autoFocus(s, frames, 'd', ppl, k);
      if (which !== 'd' && !hasMobile) focus.m = autoFocus(s, frames, 'm', ppl, k);
      return { ...cur, focus };
    });
  }
  function fitMobile(el: HTMLImageElement, ppl: Person[]) {
    setP((cur) => ({ ...cur, focus: { ...cur.focus, m: autoFocus(size(el), frames, 'm', ppl, null) } }));
  }

  const views: View[] = useMemo(() => frames.flatMap((frame) => {
    const ratios = frame.ratios[0] === frame.ratios[1] ? [frame.ratios[0]] : frame.ratios;
    return ratios.map((ratio, i) => ({
      key: `${frame.label}-${i}`, frame, ratio, mobile: frame.use === 'm' && hasMobile,
    }));
  }), [frames, hasMobile]);

  const posFor = (use: 'd' | 'm'): Pt => (use === 'm' ? p.focus?.m ?? p.focus?.d : p.focus?.d) ?? { x: 50, y: 50 };

  const results = views.map((v) => {
    const el = v.mobile ? imgM : img;
    const view = visibleArea(size(el).w, size(el).h, v.ratio, posFor(v.frame.use));
    const issues: Issue[] = el ? checkView(view, v.mobile ? peopleM : people, v.mobile ? null : keep) : [];
    return { ...v, view, issues };
  });
  const problems = results.filter((r) => r.issues.some((i) => i.level === 'bad')).length;
  const activeView = results.find((r) => r.key === active && !r.mobile);

  const setFocus = (use: 'd' | 'm', pt: Pt) => setP((cur) => ({ ...cur, focus: { ...cur.focus, [use]: pt } }));

  async function choose(which: 'main' | 'mobile', file?: File) {
    if (!file) return;
    setError('');
    setBusy('Preparing photo…');
    try {
      const prep = await prepare(file);
      setPending((cur) => ({ ...cur, [which]: prep }));
      if (which === 'main') { setKeep(null); setPeople([]); }
    } catch (e) {
      setError(explain(e));
    } finally {
      setBusy('');
    }
  }

  async function save() {
    if (!p.alt.trim()) { setError('Please describe the photo in one line (for Google and blind visitors).'); return; }
    setError('');
    try {
      const out: Photo = { ...p, keep: keep ? [keep] : undefined, people, peopleM: hasMobile ? peopleM : undefined };
      const name = slugify(nameHint) || 'photo';
      if (pending.main) {
        setBusy('Uploading photo…');
        out.src = await uploadImage(pending.main.big, name);
        out.srcSm = await uploadImage(pending.main.small, `${name}-sm`);
        out.w = pending.main.w;
        out.h = pending.main.h;
      }
      if (pending.mobile) {
        setBusy('Uploading phone photo…');
        out.mobileSrc = await uploadImage(pending.mobile.big, `${name}-phone`);
      }
      if (!hasMobile) { delete out.mobileSrc; delete out.peopleM; }
      onSave(out);
    } catch (e) {
      setError(explain(e));
    } finally {
      setBusy('');
    }
  }

  const lowRes = img && img.naturalWidth < minWidth && (pending.main ? pending.main.origW < minWidth : true);

  return (
    <Modal title={title} onClose={onClose} wide>
      <div class="pe">
        <div class="pe__main">
          <Stage img={img} src={mainSrc} people={people} keep={keep} mark={mark} crop={activeView?.view}
            onTogglePerson={(i) => setPeople(people.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))}
            onKeep={(b) => { setKeep(b); setMark(false); }} />
          <div class="pe__tools">
            <label class="btn btn--light">
              Replace photo
              <input type="file" accept="image/*" hidden onChange={(e) => choose('main', (e.currentTarget as HTMLInputElement).files?.[0])} />
            </label>
            <button type="button" class={`btn ${mark ? 'btn--primary' : 'btn--light'}`} onClick={() => setMark(!mark)}>
              {mark ? 'Drag on the photo…' : keep ? 'Re-mark important area' : 'Mark important area'}
            </button>
            {keep && <button type="button" class="btn btn--ghost" onClick={() => setKeep(null)}>Remove marked area</button>}
            <button type="button" class="btn btn--light" disabled={!img} onClick={() => { if (img) fit(img, people, keep, 'both'); if (imgM) fitMobile(imgM, peopleM); }}>Auto-fit all</button>
          </div>
          <p class="pe__status">
            {detect === 'running' && 'Looking for people and faces…'}
            {detect === 'done' && (people.length
              ? <>Found {people.length} {people.length === 1 ? 'person' : 'people'}. <b>Green</b> = must stay in the photo; tap a box to switch a person off (e.g. someone in the background). <b>Red</b> = head.</>
              : 'No people found. Use “Mark important area” to choose what must stay visible.')}
            {detect === 'failed' && 'Could not check for people on this device. Use “Mark important area” and check the previews yourself.'}
          </p>
          {lowRes && <p class="pe__warn">⚠ This photo is small ({img?.naturalWidth}px wide). It may look blurry here; a bigger photo is better.</p>}
          <Field label="Describe the photo (one line)" hint="Helps Google and blind visitors. e.g. “Trainer helping a woman on her first scooty ride”">
            <input class="input" maxLength={125} value={p.alt} onInput={(e) => setP({ ...p, alt: (e.currentTarget as HTMLInputElement).value })} />
          </Field>
          {allowMobile && (
            <div class="pe__mobile">
              {hasMobile ? (
                <>
                  <span>A separate photo is used on phones.</span>
                  <label class="btn btn--light">Change phone photo<input type="file" accept="image/*" hidden onChange={(e) => choose('mobile', (e.currentTarget as HTMLInputElement).files?.[0])} /></label>
                  <button type="button" class="btn btn--ghost" onClick={() => { setPending({ ...pending, mobile: undefined }); setP({ ...p, mobileSrc: undefined }); }}>Use the same photo on phones</button>
                </>
              ) : (
                <label class="btn btn--light">Use a different (tall) photo on phones<input type="file" accept="image/*" hidden onChange={(e) => choose('mobile', (e.currentTarget as HTMLInputElement).files?.[0])} /></label>
              )}
            </div>
          )}
        </div>

        <div class="pe__side">
          <h3>How it will look</h3>
          <p class="muted">Drag inside a preview to move the photo. Each screen size is checked automatically.</p>
          {results.map((r) => (
            <div class="pv" onMouseEnter={() => setActive(r.key)} onMouseLeave={() => setActive(null)}>
              <div class="pv__head">
                <strong>{r.frame.label}{r.frame.ratios[0] !== r.frame.ratios[1] ? (r.ratio === r.frame.ratios[0] ? ' · narrow' : ' · wide') : ''}</strong>
                {r.issues.length === 0
                  ? <span class="badge badge--ok">✓ Fits</span>
                  : r.issues.map((i) => <span class={`badge badge--${i.level}`}>⚠ {i.text}</span>)}
              </div>
              <Preview src={r.mobile ? mobileSrc! : mainSrc} el={r.mobile ? imgM : img} ratio={r.ratio} pos={posFor(r.frame.use)}
                onMove={(pt) => setFocus(r.frame.use, pt)} />
            </div>
          ))}
          {error && <p class="error">{error}</p>}
          <div class="pe__actions">
            {problems > 0 && <p class="pe__warn">⚠ {problems} {problems === 1 ? 'view cuts' : 'views cut'} a head or your marked area. Drag the preview or press “Auto-fit all”. If it still doesn’t fit, this photo is too wide/tall for this place — try another photo.</p>}
            <button type="button" class="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button type="button" class="btn btn--primary" disabled={Boolean(busy)} onClick={save}>{busy || (problems ? 'Save anyway' : 'Save photo')}</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// The whole photo with people, heads, the marked area and the selected crop.
function Stage({ img, src, people, keep, mark, crop, onTogglePerson, onKeep }: {
  img: HTMLImageElement | null; src: string; people: Person[]; keep: Box | null; mark: boolean; crop?: Box;
  onTogglePerson: (i: number) => void; onKeep: (b: Box) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<Box | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const at = (e: PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)), y: Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100)) };
  };
  const box = (a: { x: number; y: number }, b: { x: number; y: number }): Box => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) });
  const pct = (b: Box) => ({ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` });
  const ratio = img ? img.naturalWidth / img.naturalHeight : 1.5;

  return (
    <div class={`stage ${mark ? 'stage--mark' : ''}`} ref={ref} style={{ aspectRatio: String(ratio) }}
      onPointerDown={(e) => { if (!mark) return; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); start.current = at(e); setDraft(null); }}
      onPointerMove={(e) => { if (mark && start.current) setDraft(box(start.current, at(e))); }}
      onPointerUp={(e) => { if (mark && start.current) { const b = box(start.current, at(e)); start.current = null; setDraft(null); if (b.w > 3 && b.h > 3) onKeep(b); } }}>
      <img src={src} alt="" draggable={false} />
      {people.map((pp, i) => (
        <>
          <button type="button" class={`stage__person ${pp.on ? 'is-on' : ''}`} style={pct(pp.box)} title={pp.on ? 'Must stay visible (tap to ignore)' : 'Ignored (tap to keep)'}
            onClick={() => !mark && onTogglePerson(i)} />
          {pp.on && <span class="stage__head" style={pct(pp.head)} />}
        </>
      ))}
      {keep && <span class="stage__keep" style={pct(keep)}><em>Must stay visible</em></span>}
      {draft && <span class="stage__keep" style={pct(draft)} />}
      {crop && <span class="stage__crop" style={pct(crop)} />}
    </div>
  );
}

// One screen-size preview. Dragging moves the photo inside the frame.
function Preview({ src, el, ratio, pos, onMove }: { src: string; el: HTMLImageElement | null; ratio: number; pos: Pt; onMove: (p: Pt) => void }) {
  const maxW = 300, baseH = 150;
  const w = Math.min(maxW, baseH * ratio);
  const h = w / ratio;
  const drag = useRef<{ x: number; y: number; pos: Pt } | null>(null);
  const iw = el?.naturalWidth || 1, ih = el?.naturalHeight || 1;
  const scale = Math.max(w / iw, h / ih);
  const overX = iw * scale - w, overY = ih * scale - h;
  return (
    <div class="pv__frame" style={{ width: `${w}px`, height: `${h}px`, cursor: overX > 1 || overY > 1 ? 'grab' : 'default' }}
      onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, pos }; }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const x = overX > 1 ? d.pos.x - ((e.clientX - d.x) / overX) * 100 : d.pos.x;
        const y = overY > 1 ? d.pos.y - ((e.clientY - d.y) / overY) * 100 : d.pos.y;
        onMove({ x: Math.round(Math.min(100, Math.max(0, x))), y: Math.round(Math.min(100, Math.max(0, y))) });
      }}
      onPointerUp={() => { drag.current = null; }}>
      <img src={src} alt="" draggable={false} style={{ objectPosition: `${pos.x}% ${pos.y}%` }} />
    </div>
  );
}
