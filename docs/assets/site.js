// Script du site de documentation : enregistre les composants et ajoute les interactions de la doc.
import * as rds from '../../src/index';

// Les exemples utilisent `rds.toast(...)` dans des `onclick` : on expose le module.
window.rds = rds;

// ── Copie du code d'un exemple ──
document.addEventListener('click', async (event) => {
  const button = event.target instanceof Element ? event.target.closest('[data-copy]') : null;
  if (!button) return;
  const code = button.parentElement?.querySelector('code')?.textContent ?? '';
  try {
    await navigator.clipboard.writeText(code);
    button.setAttribute('icon', 'check');
    rds.toast({ message: 'Code copié', type: 'success', duration: 1500 });
    setTimeout(() => button.setAttribute('icon', 'copy'), 1500);
  } catch {
    rds.toast({ message: 'Copie impossible', type: 'error' });
  }
});

// ── Recherche dans la navigation ──
const search = document.getElementById('nav-search');
const nav = document.querySelector('rds-sidenav');
if (search && nav) {
  const links = [...nav.querySelectorAll('a')];
  const groups = [...nav.querySelectorAll('details')];
  const openByDefault = groups.map((group) => group.open);
  search.addEventListener('input', () => {
    const query = String(search.value ?? '')
      .trim()
      .toLowerCase();
    for (const link of links)
      link.hidden = !!query && !link.textContent.toLowerCase().includes(query);
    groups.forEach((group, i) => {
      const visible = [...group.querySelectorAll('a')].some((a) => !a.hidden);
      group.hidden = !!query && !visible;
      group.open = query ? visible : openByDefault[i];
    });
  });
}

// ── Page « tokens » : pastilles de couleurs lues depuis `:root` ──
const swatches = document.getElementById('swatches');
if (swatches) {
  const tokens = [
    'background-action-primary',
    'background-action-secondary',
    'background-action-danger',
    'background-action-success',
    'background-action-warning',
    'text-action-primary',
    'text-action-secondary',
    'text-action-tertiary',
    'background-surface',
    'background-surface-variant',
    'background-inverse',
    'text-default',
    'text-muted',
    'border-strong',
    'focus-ring-color',
  ];
  swatches.innerHTML = tokens
    .map(
      (token) => `<div class="swatch">
  <div class="states">
    <div style="background:var(--ds-${token})"></div>
    <div style="background:var(--ds-${token}-hover)"></div>
    <div style="background:var(--ds-${token}-active)"></div>
  </div>
  <p><code>--ds-${token}</code><br>défaut · hover · active</p>
</div>`,
    )
    .join('');
}
