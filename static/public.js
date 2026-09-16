'use strict';
// Public Pages has no backend: filter the escaped, pre-rendered cards locally.
const library = document.querySelector('#library');
if (library) {
  const form = library.querySelector('.search-form');
  const search = form.querySelector('[name="q"]');
  const chips = [...library.querySelectorAll('.filter-chip')];
  const cards = [...library.querySelectorAll('.skill-card')];
  const result = document.querySelector('#public-results');
  const empty = document.querySelector('#public-empty');
  function apply() {
    const params = new URLSearchParams(location.search);
    const query = (params.get('q') || '').trim().slice(0, 80);
    const category = (params.get('category') || '').slice(0, 30);
    search.value = query;
    let count = 0;
    for (const card of cards) {
      const match = card.querySelector('h3').textContent.toLowerCase().includes(query.toLowerCase()) &&
        (!category || card.querySelector('.category-tag').textContent === category);
      card.hidden = !match;
      if (match) count++;
    }
    for (const chip of chips) {
      const url = new URL(chip.href);
      chip.classList.toggle('selected', (url.searchParams.get('category') || '') === category);
      if (query) url.searchParams.set('q', query); else url.searchParams.delete('q');
      chip.href = url.href;
    }
    if (result) {
      result.hidden = !query && !category;
      result.querySelector('span').textContent = `找到 ${count} 个技能`;
    }
    if (empty) empty.hidden = count !== 0;
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    const url = new URL(location.href);
    const query = search.value.trim().slice(0, 80);
    if (query) url.searchParams.set('q', query); else url.searchParams.delete('q');
    url.hash = 'library';
    history.pushState(null, '', url);
    apply();
  });
  for (const link of [...chips, ...library.querySelectorAll('[data-clear-filters]')]) {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      history.pushState(null, '', link.href);
      apply();
    });
  }
  window.addEventListener('popstate', apply);
  apply();
}
