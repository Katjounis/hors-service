// Préférences d'affichage propres à ce téléphone : mode clair ou sombre, français ou anglais.
import { useState, useEffect } from 'preact/hooks';
import { getLang, setLang, onLang } from '../i18n/index.js';

const TKEY = 'hs:theme';
export function loadTheme() {
  try { const v = localStorage.getItem(TKEY); if (v === 'light' || v === 'dark') return v; } catch (e) { /* stockage bloqué */ }
  return 'dark';
}
export function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', t === 'light' ? '#EFE8DB' : '#1C1A17');
}

export function PrefToggles({ compact = false }) {
  const [theme, setTheme] = useState(loadTheme);
  const [lang, setL] = useState(getLang());
  useEffect(() => onLang(setL), []);
  const flipTheme = () => {
    const t = theme === 'light' ? 'dark' : 'light';
    setTheme(t);
    applyTheme(t);
    try { localStorage.setItem(TKEY, t); } catch (e) { /* stockage bloqué */ }
  };
  return (
    <div class={`prefs${compact ? ' is-compact' : ''}`}>
      <button type="button" class="pref-btn" aria-pressed={theme === 'light' ? 'true' : 'false'} onClick={flipTheme}>
        <span class={`pref-dot${theme === 'light' ? ' is-light' : ''}`} aria-hidden="true" />{theme === 'light' ? 'Mode sombre' : 'Mode clair'}
      </button>
      <button type="button" class="pref-btn" translate="no" lang={lang === 'en' ? 'fr' : 'en'} onClick={() => setLang(lang === 'en' ? 'fr' : 'en')}>
        {lang === 'en' ? 'Français' : 'English'}
      </button>
    </div>
  );
}
