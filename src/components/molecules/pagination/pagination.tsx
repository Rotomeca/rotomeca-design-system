import { Attr, Define } from '../../../core/scripts/decorators';
import { TAG_PAGINATION } from '../../../core/scripts/utils/tags';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import { RotomecaIcon } from '../../atoms/icon/icon';
import style from './pagination.less';

export { RotomecaPagination };

const TEMPLATE = (
  <nav id="nav" part="nav">
    <ul id="list"></ul>
  </nav>
);

/** Icône Lucide en balisage (contenu des boutons générés). */
const icon = (name: string): string => `<${RotomecaIcon.tagName} name="${name}"></${RotomecaIcon.tagName}>`;

/**
 * Pagination : première / précédente / pages avec ellipses / suivante / dernière, en boutons ou en liens.
 *
 * @remarks
 * En mode boutons, `page` est mis à jour au clic et le focus suit. En mode `href`, les liens
 * (`?page={page}`) laissent la navigation au serveur.
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `total` | nombre | Nombre de pages. |
 * | `page` | nombre (1) | Page courante (`aria-current`). |
 * | `siblings` | nombre (1) | Pages affichées de part et d'autre. |
 * | `href` | `?page={page}` | Génère des liens au lieu de boutons. |
 * | `label` | texte (défaut « Pagination ») | Nom accessible. |
 * | `compact` | booléen | Masque « Précédente / Suivante » (icônes seules). |
 * | `no-ends` | booléen | Sans première / dernière. |
 * | `size` | `sm` | Version compacte. |
 *
 * @csspart nav - L'élément `nav`.
 * @fires rds-pagination:change - Changement de page demandé (annulable) ; `detail: { page }`.
 *
 * @example
 * ```html
 * <rds-pagination total="24" page="7"></rds-pagination>
 * ```
 */
@Define({ tag: TAG_PAGINATION, template: TEMPLATE, styles: style })
class RotomecaPagination extends BaseElementInternal {
  /** Pages affichées de part et d'autre de la page courante. */
  @Attr() accessor siblings: number = 1;
  /** Masque les libellés « Précédente / Suivante ». */
  @Attr() accessor compact: boolean = false;
  /** Retire les boutons première / dernière page. */
  @Attr('no-ends') accessor noEnds: boolean = false;
  /** Taille : `sm` pour la version compacte. */
  @Attr() accessor size: string = '';

  static observedAttributes: string[] = [
    'page',
    'total',
    'href',
    'label',
    'siblings',
    'compact',
    'no-ends',
  ];

  /** Nombre de pages (au moins 1). */
  get total(): number {
    return Math.max(1, this.numberAttribute('total', 1));
  }
  set total(value: number) {
    this.setStringAttribute('total', value);
  }

  /** Page courante, bornée à `[1, total]`. */
  get page(): number {
    return Math.min(this.total, Math.max(1, this.numberAttribute('page', 1)));
  }
  set page(value: number) {
    this.setStringAttribute('page', value);
  }

  /** Modèle d'adresse des liens (`?page={page}`), vide en mode boutons. */
  get href(): string {
    return this.stringAttribute('href');
  }
  set href(value: string) {
    this.setStringAttribute('href', value || null);
  }

  /** Nom accessible de la navigation. */
  get label(): string {
    return this.stringAttribute('label');
  }
  set label(value: string) {
    this.setStringAttribute('label', value || null);
  }

  protected onConnect(): void {
    this.resources.listen(this.require('#list'), 'click', (event) => {
      const target = (event.target as Element).closest<HTMLElement>('[data-page]');
      if (!target || target.getAttribute('aria-disabled') === 'true') return;
      const page = Number(target.dataset.page);
      if (!this.emit('rds-pagination:change', { page }, { cancelable: true })) {
        event.preventDefault();
        return;
      }
      if (!this.href) {
        this.page = page;
        // Le focus suit la page courante, recréée par la mise à jour.
        this.updateComplete.then(() => {
          this.query<HTMLElement>(`[data-page="${page}"][aria-current]`)?.focus();
        });
      }
    });
  }

  protected update(): void {
    const { page, total } = this;
    const ends = !this.noEnds;
    const items: HTMLElement[] = [];
    if (ends) items.push(this.#_make(1, 'nav', icon('chevrons-left'), 'Première page', page === 1));
    items.push(
      this.#_make(
        page - 1,
        'nav',
        `${icon('chevron-left')}<span class="label-text">Précédente</span>`,
        'Page précédente',
        page === 1,
      ),
    );
    for (const entry of this.#_pages()) {
      if (entry === '…') {
        const gap = document.createElement('li');
        gap.className = 'ellipsis';
        gap.textContent = '…';
        gap.setAttribute('aria-hidden', 'true');
        items.push(gap);
      } else {
        items.push(
          this.#_make(entry, 'page', String(entry), `Page ${entry}`, false, entry === page),
        );
      }
    }
    items.push(
      this.#_make(
        page + 1,
        'nav',
        `<span class="label-text">Suivante</span>${icon('chevron-right')}`,
        'Page suivante',
        page === total,
      ),
    );
    if (ends)
      items.push(this.#_make(total, 'nav', icon('chevrons-right'), 'Dernière page', page === total));

    this.require('#list').replaceChildren(...items);
    this.require('#nav').setAttribute('aria-label', this.label || 'Pagination');
  }

  /** Numéros affichés, avec `'…'` pour les trous de plus d'une page. */
  #_pages(): (number | '…')[] {
    const { page, total } = this;
    const siblings = Math.max(0, Number(this.siblings) || 0);
    const set = new Set([1, total]);
    for (let i = page - siblings; i <= page + siblings; i++) if (i >= 1 && i <= total) set.add(i);
    const sorted = [...set].sort((a, b) => a - b);
    const out: (number | '…')[] = [];
    sorted.forEach((value, index) => {
      if (index && value - sorted[index - 1] === 2) out.push(value - 1);
      else if (index && value - sorted[index - 1] > 2) out.push('…');
      out.push(value);
    });
    return out;
  }

  #_make(
    page: number,
    className: string,
    content: string,
    label: string,
    disabled = false,
    current = false,
  ): HTMLElement {
    const href = this.href;
    const link = disabled || !href;
    const element = document.createElement(link ? 'button' : 'a');
    element.className = className;
    element.dataset.page = String(page);
    if (element instanceof HTMLAnchorElement) element.href = href.replace('{page}', String(page));
    else (element as HTMLButtonElement).type = 'button';
    element.setAttribute('aria-label', label);
    if (disabled) element.setAttribute('aria-disabled', 'true');
    if (current) element.setAttribute('aria-current', 'page');
    // Contenu interne maîtrisé (icônes et libellés fixes), jamais de saisie utilisateur.
    element.innerHTML = content;
    const entry = document.createElement('li');
    entry.append(element);
    return entry;
  }
}
