/**
 * Générateur du site de documentation (voir `docs/site.config.mjs`).
 *
 *   node scripts/docs.mjs           build de production dans `site/`
 *   node scripts/docs.mjs --watch   build + serveur local (http://localhost:5174) + rechargement
 *
 * Variable d'environnement `DOCS_BASE` : préfixe d'URL du site (défaut `/rotomeca-design-system/`,
 * `/` en mode watch). Aucune dépendance en plus de celles du dépôt (esbuild, less).
 */
import { mkdirSync, readdirSync, rmSync, statSync, watch } from 'node:fs';
import { cp, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { build, context, transform } from 'esbuild';
import less from 'less';
import { guides, levels, pages, site } from '../docs/site.config.mjs';
import { lessPlugin } from './less-plugin.mjs';

const WATCH = process.argv.includes('--watch');
const PORT = 5174;
const OUT = 'site';
const BASE = normalizeBase(process.env.DOCS_BASE ?? (WATCH ? '/' : '/rotomeca-design-system/'));

/** @param {string} base */
function normalizeBase(base) {
  let value = base.startsWith('/') ? base : `/${base}`;
  if (!value.endsWith('/')) value += '/';
  return value;
}

// ───────────────────────── Utilitaires ─────────────────────────

/** @param {string} text */
const esc = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const url = (path = '') => `${BASE}${path}`;
const pageUrl = (page) => url(`components/${page.slug}.html`);

// ───────────────────────── Tags et TSDoc ─────────────────────────

/** Constantes `TAG_*` → nom de tag (`rds-…`). */
async function readTags() {
  const source = await readFile('src/core/scripts/utils/tags.ts', 'utf8');
  /** @type {Map<string, string>} */
  const map = new Map();
  for (const [, constant, name] of source.matchAll(
    /export const (TAG_\w+)\s*=\s*`\$\{base\}([\w-]+)`/g,
  )) {
    map.set(constant, `rds-${name}`);
  }
  return map;
}

/**
 * Découpe un bloc TSDoc en description + sections `@xxx`.
 *
 * @param {string} raw
 */
function parseDoc(raw) {
  const lines = raw.split(/\r?\n/).map((line) => line.replace(/^\s*\* ?/, ''));
  /** @type {{ tag: string, text: string }[]} */
  const sections = [{ tag: 'description', text: '' }];
  let inFence = false;
  for (const line of lines) {
    if (line.trimStart().startsWith('```')) inFence = !inFence;
    const match = !inFence && line.match(/^@(\w+)\s?(.*)$/);
    if (match) sections.push({ tag: match[1], text: match[2] });
    else sections[sections.length - 1].text += `${line}\n`;
  }
  const get = (tag) => sections.filter((s) => s.tag === tag).map((s) => s.text.trim());
  /** `{Type} nom - description` (type et nom facultatifs). */
  const entries = (tag) =>
    get(tag).map((text) => {
      const match = text.match(/^(?:\{(.*?)\}\s*)?(.*?)\s*-\s+([\s\S]*)$/);
      if (!match) return { type: '', name: text, text: '' };
      return { type: match[1] ?? '', name: match[2].trim(), text: match[3].trim() };
    });
  return {
    description: get('description')[0] ?? '',
    remarks: get('remarks')[0] ?? '',
    slots: entries('slot'),
    parts: entries('csspart'),
    events: entries('fires'),
    states: entries('cssstate'),
    props: entries('cssprop'),
  };
}

/** Extrait la doc de chaque composant (`@Define({ tag: TAG_X … })`) sous `src/components`. */
async function extractDocs(tagMap) {
  /** @type {Map<string, ReturnType<typeof parseDoc>>} */
  const docs = new Map();
  const pattern = /\/\*\*((?:(?!\*\/)[\s\S])*)\*\/\s*@Define\(\{\s*tag:\s*(TAG_\w+)/g;
  for (const file of walk('src/components')) {
    if (!/\.tsx?$/.test(file)) continue;
    const source = await readFile(file, 'utf8');
    for (const [, raw, constant] of source.matchAll(pattern)) {
      const tag = tagMap.get(constant);
      if (tag) docs.set(tag, parseDoc(raw));
    }
  }
  return docs;
}

// ───────────────────────── Markdown minimal ─────────────────────────

/** @param {string} text */
function inline(text) {
  return esc(text)
    .replace(/\{@link\s+([^}]+)\}/g, '<code>$1</code>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>');
}

/** @param {string[]} rows */
function tableHtml(rows) {
  const cells = (row) =>
    row
      .trim()
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((cell) => cell.trim());
  const [head, , ...body] = rows;
  return (
    '<rds-table striped><table><thead><tr>' +
    cells(head)
      .map((c) => `<th>${inline(c)}</th>`)
      .join('') +
    '</tr></thead><tbody>' +
    body
      .map(
        (row) =>
          `<tr>${cells(row)
            .map((c) => `<td>${inline(c)}</td>`)
            .join('')}</tr>`,
      )
      .join('') +
    '</tbody></table></rds-table>'
  );
}

/** @param {string} markdown */
function markdown(markdown) {
  const blocks = [];
  let lines = markdown.split(/\r?\n/);
  while (lines.length) {
    if (!lines[0].trim()) {
      lines.shift();
    } else if (lines[0].trim().startsWith('```')) {
      const end = lines.findIndex((line, i) => i > 0 && line.trim().startsWith('```'));
      const body = lines.slice(1, end === -1 ? undefined : end);
      blocks.push(codeBlock(body.join('\n')));
      lines = lines.slice(end === -1 ? lines.length : end + 1);
    } else if (lines[0].trim().startsWith('|')) {
      const count = lines.findIndex((line) => !line.trim().startsWith('|'));
      const rows = lines.slice(0, count === -1 ? undefined : count);
      blocks.push(tableHtml(rows));
      lines = lines.slice(rows.length);
    } else if (/^\s*[-*] /.test(lines[0])) {
      const items = [];
      while (lines.length && /^\s*[-*] /.test(lines[0]))
        items.push(lines.shift().replace(/^\s*[-*] /, ''));
      blocks.push(`<ul>${items.map((i) => `<li>${inline(i)}</li>`).join('')}</ul>`);
    } else {
      const para = [];
      while (lines.length && lines[0].trim() && !/^\s*([-*] |\||```)/.test(lines[0]))
        para.push(lines.shift().trim());
      blocks.push(`<p>${inline(para.join(' '))}</p>`);
    }
  }
  return blocks.join('\n');
}

// ───────────────────────── Coloration HTML ─────────────────────────

/** @param {string} code */
function highlight(code) {
  const token = /<!--[\s\S]*?-->|<\/?[a-zA-Z][\w-]*(?:"[^"]*"|'[^']*'|[^>"'])*>/g;
  let out = '';
  let last = 0;
  for (const match of code.matchAll(token)) {
    out += esc(code.slice(last, match.index));
    last = match.index + match[0].length;
    const part = match[0];
    if (part.startsWith('<!--')) {
      out += `<span class="tk-c">${esc(part)}</span>`;
      continue;
    }
    const head = part.match(/^<\/?[\w-]+/)[0];
    const closing = part.endsWith('/>') ? '/>' : '>';
    const inner = part.slice(head.length, part.length - closing.length);
    const attrs = inner.replace(
      /([^\s=/>"']+)(=)?("[^"]*"|'[^']*')?/g,
      (_all, name, eq, value) =>
        `<span class="tk-a">${esc(name)}</span>${eq ? '=' : ''}${value ? `<span class="tk-s">${esc(value)}</span>` : ''}`,
    );
    out += `<span class="tk-t">${esc(head)}</span>${attrs}<span class="tk-t">${esc(closing)}</span>`;
  }
  return out + esc(code.slice(last));
}

/** @param {string} code */
function codeBlock(code) {
  return `<div class="code"><pre><code>${highlight(code)}</code></pre></div>`;
}

// ───────────────────────── Exemples ─────────────────────────

/**
 * Lit `docs/examples/<slug>.html` : blocs `<!-- example: Titre -->` suivis du snippet ; directives
 * facultatives dans le bloc : `<!-- note: … -->`, `<!-- layout: stack|block -->`, `<!-- height: 14rem -->`.
 */
async function readExamples(slug) {
  const text = await readFile(`docs/examples/${slug}.html`, 'utf8');
  const parts = text.split(/^<!--\s*example:\s*(.*?)\s*-->[ \t]*$/m);
  const examples = [];
  for (let i = 1; i < parts.length; i += 2) {
    let body = parts[i + 1];
    const directive = (name) => {
      const match = body.match(new RegExp(`<!--\\s*${name}:\\s*([\\s\\S]*?)-->\\s*`));
      if (match) body = body.replace(match[0], '');
      return match?.[1].trim() ?? '';
    };
    examples.push({
      title: parts[i],
      note: directive('note'),
      layout: directive('layout'),
      height: directive('height'),
      code: body.trim(),
    });
  }
  return examples;
}

/** Tags `rds-*` utilisés dans un snippet. */
const usedTags = (code) => [...code.matchAll(/<(rds-[a-z0-9-]+)/g)].map((m) => m[1]);

// ───────────────────────── Gabarits HTML ─────────────────────────

const THEME_BOOT =
  "try{var m=localStorage.getItem('rds-theme')||'system';" +
  "document.documentElement.setAttribute('data-theme',m==='dark'||(m==='system'&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light')}catch(e){}";

function sidenav(activeKey) {
  const link = (href, label, key, icon = '') =>
    `<a href="${href}"${key === activeKey ? ' aria-current="page"' : ''}>${icon ? `<rds-icon name="${icon}"></rds-icon>` : ''}${esc(label)}</a>`;
  const groups = levels
    .map((level) => {
      const items = pages.filter((p) => p.level === level.id);
      const open = items.some((p) => `c:${p.slug}` === activeKey);
      return (
        `<details${open ? ' open' : ''}><summary>${level.title} <small>(${items.length})</small></summary>` +
        `<div class="rds-sn-list">${items.map((p) => link(pageUrl(p), p.title, `c:${p.slug}`)).join('')}</div></details>`
      );
    })
    .join('');
  return (
    `<rds-sidenav heading="Documentation"><div class="rds-sn-list">` +
    link(url(), 'Accueil', 'home', 'house') +
    guides.map((g) => link(url(`guide/${g.slug}.html`), g.title, `g:${g.slug}`, g.icon)).join('') +
    link(url('components/'), 'Tous les composants', 'catalog', 'layout-grid') +
    groups +
    `</div></rds-sidenav>`
  );
}

/**
 * Page complète.
 *
 * @param {{ title: string, description?: string, body: string, activeKey?: string, crumbs?: [string, string?][], narrow?: boolean }} options
 */
function layout({
  title,
  description = site.description,
  body,
  activeKey = '',
  crumbs = [],
  narrow = false,
}) {
  const fullTitle = title === site.title ? title : `${title} — ${site.title}`;
  const trail = crumbs.length
    ? `<rds-breadcrumb>${[['Accueil', url()], ...crumbs]
        .map(([label, href], i, all) =>
          i === all.length - 1 || !href
            ? `<span>${esc(label)}</span>`
            : `<a href="${href}">${esc(label)}</a>`,
        )
        .join('')}</rds-breadcrumb>`
    : '';
  return `<!doctype html>
<html lang="fr" data-theme="light">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(fullTitle)}</title>
    <meta name="description" content="${esc(description)}" />
    <script>${THEME_BOOT}</script>
    <link rel="stylesheet" href="${url('assets/site.css')}" />
    <link rel="modulepreload" href="${url('assets/site.js')}" />
    <script type="module" src="${url('assets/site.js')}"></script>
  </head>
  <body class="body">
    <rds-skip-links><a href="#contenu">Aller au contenu</a><a href="#navigation">Aller à la navigation</a></rds-skip-links>
    <rds-header sticky>
      <a slot="brand" href="${url()}"><rds-icon name="leaf" style="color: var(--ds-text-action-tertiary)"></rds-icon>Rotomeca DS</a>
      <nav slot="nav">
        <a href="${url()}"${activeKey === 'home' ? ' aria-current="page"' : ''}>Accueil</a>
        ${guides.map((g) => `<a href="${url(`guide/${g.slug}.html`)}"${activeKey === `g:${g.slug}` ? ' aria-current="page"' : ''}>${esc(g.title)}</a>`).join('')}
        <a href="${url('components/')}"${activeKey === 'catalog' ? ' aria-current="page"' : ''}>Composants</a>
      </nav>
      <rds-flexbox slot="actions" gap="3" align="center">
        <rds-link href="${site.repository}" external>GitHub</rds-link>
        <rds-theme-switcher icon-only></rds-theme-switcher>
      </rds-flexbox>
    </rds-header>
    <div class="layout">
      <aside class="aside" id="navigation" aria-label="Navigation de la documentation">
        <rds-input-search id="nav-search" name="q" placeholder="Rechercher un composant" label="Rechercher"></rds-input-search>
        ${sidenav(activeKey)}
      </aside>
      <main class="main${narrow ? ' main-narrow' : ''}" id="contenu">
        ${trail}
        ${body}
      </main>
    </div>
    <rds-footer>
      <rds-fragment slot="brand">
        <strong class="footer-brand">${esc(site.title)}</strong>
        <span>${esc(site.description)}</span>
      </rds-fragment>
      <div><p class="rds-footer-title">Documentation</p><ul>
        <li><a href="${url('guide/demarrage.html')}">Démarrage</a></li>
        <li><a href="${url('guide/tokens.html')}">Tokens &amp; thème</a></li>
        <li><a href="${url('components/')}">Composants</a></li>
      </ul></div>
      <div><p class="rds-footer-title">Projet</p><ul>
        <li><a href="${site.repository}">Dépôt GitHub</a></li>
        <li><a href="https://www.npmjs.com/package/${site.npm}">Paquet npm</a></li>
        <li><a href="${site.repository}/issues">Signaler un problème</a></li>
      </ul></div>
      <span slot="legal">© ${new Date().getFullYear()} Rotomeca</span>
    </rds-footer>
    <rds-back-to-top floating></rds-back-to-top>
    ${WATCH ? "<script>new EventSource('/esbuild').addEventListener('change', () => location.reload());</script>" : ''}
  </body>
</html>
`;
}

// ───────────────────────── Pages ─────────────────────────

/** Carte d'exemple : rendu vivant à gauche, code HTML à droite. */
function exampleCard(example, index, slug) {
  const id = `${slug}-${index + 1}`;
  const style = example.height ? ` style="min-height:${esc(example.height)}"` : '';
  const layoutClass = ['stack', 'block'].includes(example.layout) ? ` demo-${example.layout}` : '';
  return `<section class="example" aria-labelledby="${id}">
  <h3 id="${id}">${esc(example.title)}</h3>
  ${example.note ? `<p class="example-note">${inline(example.note)}</p>` : ''}
  <div class="example-grid">
    <div class="demo${layoutClass}"${style}>
${example.code}
    </div>
    <div class="code-wrap">
      <rds-icon-button class="copy" icon="copy" label="Copier le code" size="sm" data-copy></rds-icon-button>
      ${codeBlock(example.code)}
    </div>
  </div>
</section>`;
}

function apiTable(headers, rows) {
  return (
    '<rds-table striped><table><thead><tr>' +
    headers.map((h) => `<th>${h}</th>`).join('') +
    '</tr></thead><tbody>' +
    rows.map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('') +
    '</tbody></table></rds-table>'
  );
}

function apiSection(tag, doc) {
  const parts = [`<h3 id="api-${tag}"><code>&lt;${tag}&gt;</code></h3>`];
  if (!doc) return parts.join('\n') + '<p>Pas de documentation extraite.</p>';
  if (doc.description) parts.push(markdown(doc.description));
  if (doc.remarks) parts.push(markdown(doc.remarks));
  if (doc.slots.length)
    parts.push(
      '<h4>Slots</h4>' +
        apiTable(
          ['Slot', 'Rôle'],
          doc.slots.map((s) => [
            s.name ? `<code>${esc(s.name)}</code>` : '<em>(défaut)</em>',
            inline(s.text),
          ]),
        ),
    );
  if (doc.parts.length)
    parts.push(
      '<h4>Parts CSS</h4>' +
        apiTable(
          ['Part', 'Rôle'],
          doc.parts.map((s) => [`<code>::part(${esc(s.name)})</code>`, inline(s.text)]),
        ),
    );
  if (doc.events.length)
    parts.push(
      '<h4>Événements</h4>' +
        apiTable(
          ['Événement', 'Détail', 'Rôle'],
          doc.events.map((e) => [
            `<code>${esc(e.name)}</code>`,
            e.type ? `<code>${esc(e.type)}</code>` : '',
            inline(e.text),
          ]),
        ),
    );
  if (doc.states.length)
    parts.push(
      '<h4>États CSS</h4>' +
        apiTable(
          ['État', 'Rôle'],
          doc.states.map((s) => [`<code>:state(${esc(s.name)})</code>`, inline(s.text)]),
        ),
    );
  if (doc.props.length)
    parts.push(
      '<h4>Propriétés CSS</h4>' +
        apiTable(
          ['Propriété', 'Rôle'],
          doc.props.map((s) => [`<code>${esc(s.name)}</code>`, inline(s.text)]),
        ),
    );
  return parts.join('\n');
}

function componentPage(page, examples, docs) {
  const level = levels.find((l) => l.id === page.level);
  const tags = page.tags.map((t) => `rds-${t}`);
  const first = docs.get(tags[0]);
  const lead = first?.description ? markdown(first.description) : '';
  const body = `
<header class="page-head">
  <p class="eyebrow"><rds-badge tone="brand">${level.title.replace(/s$/, '')}</rds-badge></p>
  <h1>${esc(page.title)}</h1>
  <div class="lead">${lead}</div>
  <rds-flexbox gap="2" wrap>${tags.map((t) => `<rds-tag><code>${t}</code></rds-tag>`).join('')}</rds-flexbox>
</header>
<h2 id="exemples">Exemples</h2>
${examples.map((e, i) => exampleCard(e, i, page.slug)).join('\n')}
<h2 id="api">API</h2>
${tags.map((t) => apiSection(t, docs.get(t))).join('\n')}
`;
  return layout({
    title: page.title,
    description: first?.description?.split('\n')[0] || site.description,
    body,
    activeKey: `c:${page.slug}`,
    crumbs: [
      ['Composants', url('components/')],
      [level.title, `${url('components/')}#${level.id}`],
      [page.title],
    ],
  });
}

function catalogGrid() {
  return levels
    .map((level) => {
      const items = pages.filter((p) => p.level === level.id);
      return `<section aria-labelledby="${level.id}">
  <h2 id="${level.id}">${level.title} <rds-badge>${items.length}</rds-badge></h2>
  <p>${esc(level.lead)}</p>
  <div class="cards">${items
    .map(
      (p) =>
        `<rds-card href="${pageUrl(p)}" heading="${esc(p.title)}" size="sm"><code>${p.tags
          .map((t) => `rds-${t}`)
          .slice(0, 2)
          .join(' · ')}</code></rds-card>`,
    )
    .join('')}</div>
</section>`;
    })
    .join('\n');
}

async function writePage(path, html) {
  const file = join(OUT, path);
  mkdirSync(join(file, '..'), { recursive: true });
  await writeFile(file, html);
}

async function generatePages(tagMap) {
  const docs = await extractDocs(tagMap);
  const allTags = new Set(tagMap.values());
  const covered = new Set();
  const errors = [];

  for (const page of pages) {
    let examples;
    try {
      examples = await readExamples(page.slug);
    } catch {
      errors.push(`Exemples manquants : docs/examples/${page.slug}.html`);
      continue;
    }
    if (!examples.length)
      errors.push(`Aucun exemple (« <!-- example: … --> ») dans docs/examples/${page.slug}.html`);
    for (const tag of page.tags.map((t) => `rds-${t}`)) {
      if (!allTags.has(tag)) errors.push(`Page « ${page.slug} » : tag inconnu ${tag}`);
      covered.add(tag);
      if (!docs.has(tag)) errors.push(`TSDoc introuvable pour ${tag}`);
    }
    for (const example of examples)
      for (const tag of usedTags(example.code))
        if (!allTags.has(tag)) errors.push(`docs/examples/${page.slug}.html : tag inconnu ${tag}`);
    await writePage(`components/${page.slug}.html`, componentPage(page, examples, docs));
  }
  for (const tag of allTags)
    if (!covered.has(tag)) errors.push(`Composant sans page de documentation : ${tag}`);
  if (errors.length) {
    console.error(`[docs] ${errors.length} erreur(s) :\n - ${errors.join('\n - ')}`);
    if (!WATCH) process.exit(1);
  }

  // Catalogue
  await writePage(
    'components/index.html',
    layout({
      title: 'Composants',
      activeKey: 'catalog',
      crumbs: [['Composants']],
      body: `<header class="page-head"><h1>Composants</h1><div class="lead"><p>${allTags.size} briques, organisées selon l’Atomic Design.</p></div></header>${catalogGrid()}`,
    }),
  );

  // Accueil
  await writePage(
    'index.html',
    layout({
      title: site.title,
      activeKey: 'home',
      body: `<section class="hero">
  <p class="eyebrow"><rds-badge tone="accent">${allTags.size} composants</rds-badge></p>
  <h1>${esc(site.title)}</h1>
  <p class="lead">${esc(site.description)}</p>
  <rds-flexbox gap="3" wrap>
    <a href="${url('guide/demarrage.html')}"><rds-primary-button icon-after="arrow-right">Démarrer</rds-primary-button></a>
    <a href="${url('components/')}"><rds-secondary-button>Parcourir les composants</rds-secondary-button></a>
  </rds-flexbox>
</section>
<section class="features">
  <rds-card heading="Web Components"><rds-icon slot="media" name="blocks"></rds-icon>Custom elements et Shadow DOM : utilisables dans n’importe quel framework, ou sans.</rds-card>
  <rds-card heading="Thèmes clair et sombre"><rds-icon slot="media" name="moon"></rds-icon>Palette automnale et thème « Sous-bois », entièrement pilotés par des tokens <code>--ds-*</code>.</rds-card>
  <rds-card heading="Accessible"><rds-icon slot="media" name="accessibility"></rds-icon>ARIA, clavier complet, focus visible, mouvement réduit respecté.</rds-card>
  <rds-card heading="Léger"><rds-icon slot="media" name="feather"></rds-icon>Aucune dépendance tierce, styles partagés, animations limitées à transform et opacity.</rds-card>
</section>
<h2>Parcourir</h2>
${catalogGrid()}`,
    }),
  );

  // Guides
  for (const guide of guides) {
    const body = await readFile(`docs/guide/${guide.slug}.html`, 'utf8');
    await writePage(
      `guide/${guide.slug}.html`,
      layout({
        title: guide.title,
        activeKey: `g:${guide.slug}`,
        crumbs: [['Guide'], [guide.title]],
        body: body.replaceAll('{{base}}', BASE).replaceAll('{{npm}}', site.npm),
      }),
    );
  }

  // 404 (GitHub Pages)
  await writePage(
    '404.html',
    layout({
      title: 'Page introuvable',
      body: `<header class="page-head"><h1>Page introuvable</h1><div class="lead"><p>Cette page n’existe pas (ou plus).</p></div></header><a href="${url()}"><rds-primary-button>Retour à l’accueil</rds-primary-button></a>`,
    }),
  );
  await writeFile(join(OUT, '.nojekyll'), '');
  console.log(`[docs] ${pages.length} pages de composants, base « ${BASE} »`);
}

// ───────────────────────── Assets ─────────────────────────

async function buildCss() {
  try {
    const entry = 'docs/assets/site.less';
    const source = await readFile(entry, 'utf8');
    const { css } = await less.render(source, { filename: entry });
    const output = WATCH ? css : (await transform(css, { loader: 'css', minify: true })).code;
    mkdirSync(join(OUT, 'assets'), { recursive: true });
    await writeFile(join(OUT, 'assets/site.css'), output);
    console.log('[less] compilé');
  } catch (error) {
    console.error('[less] erreur :', error.message);
    if (!WATCH) process.exit(1);
  }
}

const jsOptions = {
  entryPoints: ['docs/assets/site.js'],
  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: !WATCH,
  outfile: join(OUT, 'assets/site.js'),
  plugins: [lessPlugin()],
  logLevel: 'info',
};

async function copyIcons() {
  await cp('node_modules/lucide-static/icons', join(OUT, 'assets/icons'), {
    recursive: true,
    filter: (source) => !source.endsWith('.json'),
  });
}

// ───────────────────────── Orchestration ─────────────────────────

// On vide le contenu plutôt que le dossier : un serveur local peut l'utiliser comme répertoire courant.
mkdirSync(OUT, { recursive: true });
for (const name of readdirSync(OUT)) rmSync(join(OUT, name), { recursive: true, force: true });
mkdirSync(join(OUT, 'assets'), { recursive: true });
const tagMap = await readTags();
await Promise.all([generatePages(tagMap), buildCss(), copyIcons()]);

if (!WATCH) {
  await build(jsOptions);
  console.log(`[docs] site généré dans ${OUT}/`);
} else {
  const ctx = await context(jsOptions);
  await ctx.watch();
  let timer;
  const schedule = (task) => {
    clearTimeout(timer);
    timer = setTimeout(task, 80);
  };
  for (const dir of ['docs', 'src']) {
    watch(dir, { recursive: true }, (_, name = '') => {
      const path = relative('.', join(dir, name)).split(sep).join('/');
      if (path.endsWith('.less')) schedule(buildCss);
      else if (dir === 'docs' && /\.(html|mjs)$/.test(path)) schedule(() => generatePages(tagMap));
      else if (dir === 'src' && /\.tsx?$/.test(path)) schedule(() => generatePages(tagMap));
    });
  }
  const { port } = await ctx.serve({ servedir: OUT, port: PORT });
  console.log(`Documentation : http://localhost:${port}`);
}
