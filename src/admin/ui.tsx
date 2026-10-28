import { useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { fonts, type FontKey } from '../cms/fonts';
import { limits, words, plain, type TextField } from '../cms/schema';

export function Field({ label, hint, children }: { label: string; hint?: ComponentChildren; children: ComponentChildren }) {
  return (
    <label class="field">
      <span class="field__label">{label}</span>
      {children}
      {hint && <span class="field__hint">{hint}</span>}
    </label>
  );
}

// Text input that refuses to go past the word and letter limits.
export function LimitedText({ field, value, onChange, maxWords, maxChars }: {
  field?: TextField; value: string; onChange: (v: string) => void; maxWords?: number; maxChars?: number;
}) {
  const lim = field ? limits(field) : { words: maxWords ?? 9999, chars: maxChars ?? 99999 };
  const w = maxWords ?? lim.words;
  const c = maxChars ?? lim.chars;
  const [msg, setMsg] = useState('');
  const multiline = field ? field.kind === 'para' || plain(field.value).length > 60 : c > 90;
  const changed = field && value !== field.value;

  const onInput = (e: Event) => {
    const el = e.currentTarget as HTMLInputElement | HTMLTextAreaElement;
    const next = el.value.replace(/\n/g, field && field.kind !== 'para' ? ' ' : '\n');
    if (words(next) > w || plain(next).length > c) {
      el.value = value;
      setMsg(words(next) > w ? `Limit reached: at most ${w} words here, so the design stays the same.` : `Limit reached: at most ${c} letters here.`);
      return;
    }
    setMsg('');
    onChange(next);
  };
  const props = { value, onInput, class: 'input' };
  return (
    <div class="limited">
      {multiline ? <textarea rows={3} {...props} /> : <input type="text" {...props} />}
      <div class="limited__meta">
        <span class={words(value) >= w ? 'is-full' : ''}>{words(value)}/{w} words</span>
        <span class={plain(value).length >= c ? 'is-full' : ''}>{plain(value).length}/{c} letters</span>
        {changed && <button type="button" class="link" onClick={() => { setMsg(''); onChange(field!.value); }}>Reset to original</button>}
      </div>
      {msg && <p class="limited__msg">{msg}</p>}
    </div>
  );
}

const groups = [...new Set(Object.values(fonts).map((f) => f.group))];

export function FontPicker({ value, def, sample, onChange }: { value?: FontKey; def: FontKey; sample: string; onChange: (k: FontKey) => void }) {
  const current = value ?? def;
  const f = fonts[current];
  return (
    <div class="font-picker">
      <select class="input" value={current} onChange={(e) => onChange((e.currentTarget as HTMLSelectElement).value as FontKey)}>
        <option value={def}>{fonts[def].name} (default)</option>
        {groups.map((g) => (
          <optgroup label={g}>
            {(Object.keys(fonts) as FontKey[]).filter((k) => fonts[k].group === g && k !== def).map((k) => <option value={k}>{fonts[k].name}</option>)}
          </optgroup>
        ))}
      </select>
      <div class="font-picker__preview" style={{ fontFamily: f.css, fontWeight: f.weight, textTransform: f.upper ? 'uppercase' : 'none' }}
        dangerouslySetInnerHTML={{ __html: sample.replace(/</g, '&lt;').replace(/\*([^*]+)\*/g, '<mark>$1</mark>').replace(/\*/g, '') }} />
    </div>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ComponentChildren; wide?: boolean }) {
  return (
    <div class="modal" role="dialog" aria-modal="true" aria-label={title}>
      <div class={`modal__box ${wide ? 'modal__box--wide' : ''}`}>
        <div class="modal__head">
          <h2>{title}</h2>
          <button type="button" class="btn btn--ghost" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div class="modal__body">{children}</div>
      </div>
    </div>
  );
}
