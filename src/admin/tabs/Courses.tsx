import { useState } from 'preact/hooks';
import { courses } from '../../data/site';
import { courseFrames, type CourseEdit, type Photo, type TextField } from '../../cms/schema';
import { PhotoEditor } from '../PhotoEditor';
import { Field, LimitedText } from '../ui';
import type { TabProps } from '../App';

const tf = (label: string, value: string): TextField => ({ label, value, kind: 'line' });

export function CoursesTab({ content, edit }: TabProps) {
  const [photoFor, setPhotoFor] = useState<string | null>(null);
  const set = (slug: string, patch: Partial<CourseEdit>) => edit((c) => ({ ...c, courses: { ...c.courses, [slug]: { ...c.courses?.[slug], ...patch } } }));

  return (
    <div class="panel">
      <h2 class="panel__title">Courses & prices</h2>
      <p class="note">These show on the home page slider, the Courses page and each course page. The detailed class-by-class plan on each course page is not editable here yet.</p>
      <div class="cards">
        {courses.map((c) => {
          const e = content.courses?.[c.slug] ?? {};
          const photo: Photo = e.photo ?? { src: c.photo.src, alt: c.photo.alt };
          return (
            <article class="card">
              <img class="card__img" src={photo.srcSm ?? photo.src} alt="" style={{ objectPosition: `${photo.focus?.d?.x ?? 50}% ${photo.focus?.d?.y ?? 50}%` }} />
              <button type="button" class="btn btn--light" onClick={() => setPhotoFor(c.slug)}>Change / adjust photo</button>
              <Field label="Course name"><LimitedText field={tf('name', c.name)} value={e.name ?? c.name} onChange={(v) => set(c.slug, { name: v })} /></Field>
              <Field label="Level tag"><LimitedText field={tf('level', c.level)} value={e.level ?? c.level} onChange={(v) => set(c.slug, { level: v })} /></Field>
              <Field label="Short description"><LimitedText field={tf('summary', c.summary)} value={e.summary ?? c.summary} onChange={(v) => set(c.slug, { summary: v })} /></Field>
              <Field label="Classes"><LimitedText field={tf('classes', c.classes)} value={e.classes ?? c.classes} onChange={(v) => set(c.slug, { classes: v })} /></Field>
              <Field label="Starting price (₹)" hint="Leave empty to show “Ask for fee”.">
                <input class="input" type="number" min={0} max={100000} step={100} value={(e.price === undefined ? c.price : e.price) ?? ''}
                  onInput={(ev) => { const v = (ev.currentTarget as HTMLInputElement).value; set(c.slug, { price: v === '' ? null : Math.max(0, Number(v)) }); }} />
              </Field>
            </article>
          );
        })}
      </div>
      {photoFor && (() => {
        const c = courses.find((x) => x.slug === photoFor)!;
        const e = content.courses?.[c.slug];
        const [x, y] = (c.photo.position ?? '50% 50%').split(' ').map(parseFloat);
        return (
          <PhotoEditor title={`${c.name} photo`} photo={e?.photo ?? { src: c.photo.src, alt: c.photo.alt, focus: { d: { x, y } } }} frames={courseFrames} nameHint={c.slug}
            onClose={() => setPhotoFor(null)} onSave={(p) => { set(c.slug, { photo: p }); setPhotoFor(null); }} />
        );
      })()}
    </div>
  );
}
