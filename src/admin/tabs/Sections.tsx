import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { sections, defaultOrder, defaultHeroLayout, type Photo, type PhotoSlot, type Section, type HeroLayout } from '../../cms/schema';
import { fonts } from '../../cms/fonts';
import { visibleArea } from '../geometry';
import { PhotoEditor } from '../PhotoEditor';
import { Field, FontPicker, LimitedText } from '../ui';
import type { TabProps } from '../App';

export function SectionsTab({ content, edit }: TabProps) {
  const [open, setOpen] = useState('hero');
  const saved = (content.order ?? []).filter((id) => defaultOrder.includes(id));
  const order = [...saved, ...defaultOrder.filter((id) => !saved.includes(id))];
  const hidden = new Set(content.hidden ?? []);
  const byId = (id: string) => sections.find((s) => s.id === id)!;

  const move = (id: string, dir: -1 | 1) => edit((c) => {
    const o = [...order];
    const i = o.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= o.length) return c;
    [o[i], o[j]] = [o[j], o[i]];
    return { ...c, order: o };
  });
  const toggle = (id: string) => edit((c) => {
    const h = new Set(c.hidden ?? []);
    h.has(id) ? h.delete(id) : h.add(id);
    return { ...c, hidden: [...h] };
  });

  return (
    <div class="split">
      <aside class="list">
        <p class="list__title">Page sections (top to bottom)</p>
        <button type="button" class={`list__item ${open === 'hero' ? 'is-active' : ''}`} onClick={() => setOpen('hero')}>
          <span>{byId('hero').label}</span><small>always first</small>
        </button>
        {order.map((id, i) => (
          <div class={`list__item ${open === id ? 'is-active' : ''} ${hidden.has(id) ? 'is-hidden' : ''}`}>
            <button type="button" class="list__name" onClick={() => setOpen(id)}>{byId(id).label}{hidden.has(id) && <small> · hidden</small>}</button>
            <span class="list__ctrl">
              <button type="button" title="Move up" disabled={i === 0} onClick={() => move(id, -1)}>↑</button>
              <button type="button" title="Move down" disabled={i === order.length - 1} onClick={() => move(id, 1)}>↓</button>
              <button type="button" title={hidden.has(id) ? 'Show on the site' : 'Hide from the site'} onClick={() => toggle(id)}>{hidden.has(id) ? '🚫' : '👁'}</button>
            </span>
          </div>
        ))}
        <button type="button" class="link" onClick={() => edit((c) => ({ ...c, order: undefined, hidden: undefined }))}>Reset order</button>
      </aside>
      <section class="panel">
        <SectionEditor key={open} section={byId(open)} content={content} edit={edit} />
      </section>
    </div>
  );
}

function SectionEditor({ section, content, edit }: { section: Section } & Pick<TabProps, 'content' | 'edit'>) {
  const [photoOpen, setPhotoOpen] = useState<string | null>(null);
  const texts = content.texts ?? {};
  const setText = (id: string, patch: { value?: string; font?: string; size?: number }) => edit((c) => {
    const t = { ...(c.texts ?? {}) };
    const next = { ...t[id], ...patch } as NonNullable<typeof t[string]>;
    const field = section.texts[id.split('.')[1]];
    if (next.value === field.value) delete next.value;
    if (next.font === field.font) delete next.font;
    if (next.size === 1) delete next.size;
    if (Object.keys(next).length) t[id] = next; else delete t[id];
    return { ...c, texts: t };
  });
  const photoOf = (key: string, slot: PhotoSlot): Photo => content.photos?.[`${section.id}.${key}`] ?? slot.photo;

  return (
    <div>
      <h2 class="panel__title">{section.label}</h2>
      {section.id === 'courses' && <p class="note">The course cards themselves (names, prices, photos) are in the “Courses & prices” tab.</p>}
      {section.id === 'gallery' && <p class="note">Add, remove and arrange these photos in the “Photos” tab. The first 7 photos show here; all of them show on the “Training in action” page.</p>}
      {section.id === 'reviews' && <p class="note">The rating and review count come from the “Contact & numbers” tab.</p>}

      {section.photos && (
        <div class="photos">
          {Object.entries(section.photos).map(([key, slot]) => {
            const ph = photoOf(key, slot);
            return (
              <div class="photo-card">
                <img src={ph.srcSm ?? ph.src} alt="" style={{ objectPosition: `${ph.focus?.d?.x ?? 50}% ${ph.focus?.d?.y ?? 50}%` }} />
                <div>
                  <strong>{slot.label}</strong>
                  <button type="button" class="btn btn--light" onClick={() => setPhotoOpen(key)}>Change / adjust photo</button>
                  {content.photos?.[`${section.id}.${key}`] && (
                    <button type="button" class="link" onClick={() => edit((c) => { const p = { ...c.photos }; delete p[`${section.id}.${key}`]; return { ...c, photos: p }; })}>Use original photo</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {section.id === 'hero' && <HeroLayoutEditor content={content} edit={edit} photo={photoOf('main', section.photos!.main)} title={texts['hero.title']?.value ?? section.texts.title.value} />}

      {Object.entries(section.texts).map(([key, field]) => {
        const id = `${section.id}.${key}`;
        const t = texts[id] ?? {};
        const value = t.value ?? field.value;
        return (
          <div class="text-field">
            <Field label={field.label} hint={field.kind === 'headline' || value.includes('*') ? <>Put *stars* around words to highlight them in yellow.</> : undefined}>
              <LimitedText field={field} value={value} onChange={(v) => setText(id, { value: v })} />
            </Field>
            {field.kind === 'headline' && field.font && (
              <div class="text-field__style">
                <Field label="Font">
                  <FontPicker value={t.font} def={field.font} sample={value} onChange={(f) => setText(id, { font: f })} />
                </Field>
                <Field label={`Size: ${Math.round((t.size ?? 1) * 100)}%`}>
                  <input type="range" min={80} max={120} step={5} value={(t.size ?? 1) * 100} onInput={(e) => setText(id, { size: Number((e.currentTarget as HTMLInputElement).value) / 100 })} />
                </Field>
              </div>
            )}
          </div>
        );
      })}

      {photoOpen && section.photos && (
        <PhotoEditor
          title={section.photos[photoOpen].label}
          photo={photoOf(photoOpen, section.photos[photoOpen])}
          frames={section.photos[photoOpen].frames}
          nameHint={`${section.id}-${photoOpen}`}
          allowMobile={section.id === 'hero'}
          minWidth={section.id === 'hero' ? 1400 : 900}
          onClose={() => setPhotoOpen(null)}
          onSave={(p) => { edit((c) => ({ ...c, photos: { ...c.photos, [`${section.id}.${photoOpen}`]: p } })); setPhotoOpen(null); }}
        />
      )}
    </div>
  );
}

// Where the hero headline sits on the photo, with a check that it doesn't cover a face.
function HeroLayoutEditor({ content, edit, photo, title }: Pick<TabProps, 'content' | 'edit'> & { photo: Photo; title: string }) {
  const L: HeroLayout = { ...defaultHeroLayout, ...content.hero };
  const set = (patch: Partial<HeroLayout>) => edit((c) => ({ ...c, hero: { ...L, ...patch } }));
  const font = fonts[(content.texts?.['hero.title']?.font as keyof typeof fonts) ?? 'anton'];
  return (
    <div class="hero-layout">
      <h3>Headline on the photo</h3>
      <div class="hero-layout__previews">
        <HeroPreview label="Computer" w={340} ratio={2.1} y={L.yD} photo={photo} title={title} L={L} font={font} use="d" />
        <HeroPreview label="Phone" w={170} ratio={0.8} y={L.yM} photo={photo} title={title} L={L} font={font} use="m" />
      </div>
      <div class="grid2">
        <Field label={`Position on computer: ${L.yD === 0 ? 'top' : L.yD === 100 ? 'bottom' : `${L.yD}% down`}`}>
          <input type="range" min={0} max={100} step={5} value={L.yD} onInput={(e) => set({ yD: Number((e.currentTarget as HTMLInputElement).value) })} />
        </Field>
        <Field label={`Position on phone: ${L.yM === 0 ? 'top' : L.yM === 100 ? 'bottom' : `${L.yM}% down`}`}>
          <input type="range" min={0} max={100} step={5} value={L.yM} onInput={(e) => set({ yM: Number((e.currentTarget as HTMLInputElement).value) })} />
        </Field>
        <Field label={`Headline size: ${Math.round(L.size * 100)}%`}>
          <input type="range" min={70} max={130} step={5} value={L.size * 100} onInput={(e) => set({ size: Number((e.currentTarget as HTMLInputElement).value) / 100 })} />
        </Field>
        <div class="checks">
          <label><input type="checkbox" checked={L.oneLine} onChange={(e) => set({ oneLine: (e.currentTarget as HTMLInputElement).checked })} /> Keep the headline on one line</label>
          <label><input type="checkbox" checked={L.align === 'center'} onChange={(e) => set({ align: (e.currentTarget as HTMLInputElement).checked ? 'center' : 'left' })} /> Centre the headline</label>
        </div>
      </div>
    </div>
  );
}

function HeroPreview({ label, w, ratio, y, photo, title, L, font, use }: {
  label: string; w: number; ratio: number; y: number; photo: Photo; title: string; L: HeroLayout; font: (typeof fonts)[keyof typeof fonts]; use: 'd' | 'm';
}) {
  const h = w / ratio;
  const src = use === 'm' && photo.mobileSrc ? photo.mobileSrc : photo.srcSm ?? photo.src;
  const pos = (use === 'm' ? photo.focus?.m ?? photo.focus?.d : photo.focus?.d) ?? { x: 50, y: 50 };
  const people = (use === 'm' && photo.mobileSrc ? photo.peopleM : photo.people) ?? [];
  const textRef = useRef<HTMLDivElement>(null);
  const [covers, setCovers] = useState(0);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    if (!size || !textRef.current) return;
    const view = visibleArea(size.w, size.h, ratio, pos);
    const box = textRef.current.getBoundingClientRect();
    const frame = textRef.current.parentElement!.getBoundingClientRect();
    const tx = ((box.left - frame.left) / w) * 100, ty = ((box.top - frame.top) / h) * 100;
    const tw = (box.width / w) * 100, th = (box.height / h) * 100;
    const n = people.filter((p) => p.on).filter((p) => {
      // head position inside the preview, in %
      const hx = ((p.head.x - view.x) / view.w) * 100, hy = ((p.head.y - view.y) / view.h) * 100;
      const hw = (p.head.w / view.w) * 100, hh = (p.head.h / view.h) * 100;
      return hx < tx + tw && hx + hw > tx && hy < ty + th && hy + hh > ty;
    }).length;
    setCovers(n);
  });

  // Title size in the real page ≈ 3.8rem on a 1366px screen / 2.4rem on a 390px phone.
  const fs = (use === 'd' ? (60 / 1366) * w : (40 / 390) * w) * L.size * (font.scale / fonts.anton.scale);
  return (
    <figure class="hp">
      <div class="hp__frame" style={{ width: `${w}px`, height: `${h}px` }}>
        <img src={src} alt="" style={{ objectPosition: `${pos.x}% ${pos.y}%` }} onLoad={(e) => { const el = e.currentTarget as HTMLImageElement; setSize({ w: el.naturalWidth, h: el.naturalHeight }); }} />
        <div class="hp__text" ref={textRef} style={{ top: `${y}%`, transform: `translateY(-${y}%)`, textAlign: L.align }}>
          <small>Scooty & bike training</small>
          <b style={{ fontSize: `${fs}px`, fontFamily: font.css, fontWeight: font.weight, textTransform: font.upper ? 'uppercase' : 'none', whiteSpace: L.oneLine ? 'nowrap' : 'normal', maxWidth: use === 'd' ? '62%' : '100%' }}
            dangerouslySetInnerHTML={{ __html: title.replace(/</g, '&lt;').replace(/\*([^*]+)\*/g, '<span>$1</span>').replace(/\*/g, '') }} />
        </div>
      </div>
      <figcaption>{label} {covers > 0 ? <span class="badge badge--bad">⚠ Headline covers a face</span> : people.length ? <span class="badge badge--ok">✓ Faces clear</span> : <span class="muted">(open the photo editor once to check faces)</span>}</figcaption>
    </figure>
  );
}
