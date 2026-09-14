(() => {
  const root = new URL('../', document.currentScript.src);
  const index = Array.isArray(window.REPO_WIKI_INDEX) ? window.REPO_WIKI_INDEX : [];
  const input = document.querySelector('#site-search');
  const filter = document.querySelector('#track-filter');
  const results = document.querySelector('#search-results');
  const normalize = (value) => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const show = () => {
    const query = normalize(input.value).trim();
    const track = filter.value;
    if (!query && !track) { results.hidden = true; results.textContent = ''; return; }
    const terms = query.split(/\s+/).filter(Boolean);
    const matches = index.filter((item) => (!track || item.track === track) && terms.every((term) => normalize(item.search).includes(term)));
    results.textContent = '';
    const title = document.createElement('div'); title.className = 'result'; title.textContent = matches.length + ' resultado(s)'; results.append(title);
    matches.slice(0, 40).forEach((item) => {
      const link = document.createElement('a'); link.className = 'result'; link.href = new URL(item.url, root).href;
      const strong = document.createElement('strong'); strong.textContent = item.title; link.append(strong);
      const small = document.createElement('small'); small.textContent = item.track + ' · ' + item.path + ' · ' + item.excerpt; link.append(small);
      results.append(link);
    });
    results.hidden = false;
  };
  input.addEventListener('input', show); filter.addEventListener('change', show);
  document.addEventListener('keydown', (event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); input.focus(); input.select(); } if (event.key === '/' && document.activeElement !== input) { event.preventDefault(); input.focus(); } if (event.key === 'Escape') { input.value = ''; filter.value = ''; show(); } });
  document.querySelector('[data-menu]')?.addEventListener('click', () => document.querySelector('#sidebar').classList.toggle('open'));
  document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => { const dark = document.documentElement.dataset.theme === 'dark'; document.documentElement.dataset.theme = dark ? 'light' : 'dark'; try { localStorage.setItem('repo-wiki-theme', dark ? 'light' : 'dark'); } catch {} });
  try { const saved = localStorage.getItem('repo-wiki-theme'); if (saved) document.documentElement.dataset.theme = saved; } catch {}
})();