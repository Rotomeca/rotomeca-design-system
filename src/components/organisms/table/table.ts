import { Define, Light } from '../../../core/scripts/decorators';
import { adoptGlobalStyle } from '../../../core/scripts/utils/globalStyle';
import { TAG_TABLE } from '../../../core/scripts/utils/tags';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import { whenParsed } from '../../base/dom';
import { RotomecaIcon } from '../../atoms/icon/icon';
import style from './table.less';

export { RotomecaTable };
export type { SortDirection };

/** Sens de tri d'une colonne. */
type SortDirection = 'ascending' | 'descending';

/**
 * Tableau : enveloppe un `<table>` natif (sémantique intacte) et ajoute styles, défilement horizontal
 * focalisable et tri accessible.
 *
 * @remarks
 * Composant en light DOM. Le `<caption>` est obligatoire : il nomme la région.
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `striped`, `hover`, `bordered`, `compact` | booléens | Lignes alternées, survol, bordures verticales, densité. |
 * | `sticky` | booléen | En-tête collant (hauteur max `--rds-table-max`, 24 rem). |
 * | `sortable` | booléen | Toutes les colonnes triables (ou `data-sort` par `<th>`, `data-nosort` pour exclure). |
 *
 * Cellules : `class="rds-num"` ou `data-type="number"` (alignement à droite, chiffres tabulaires),
 * `data-value` pour trier sur une valeur brute. Le tri pose `aria-sort` sur l'en-tête.
 *
 * @fires rds-table:sort - Tri effectué ; `detail: { column, direction }`.
 *
 * @example
 * ```html
 * <rds-table striped sortable>
 *   <table><caption>Palette</caption>
 *     <thead><tr><th>Nom</th><th data-type="number">Contraste</th></tr></thead>
 *     <tbody><tr><td>Marron</td><td class="rds-num" data-value="8.63">8.63:1</td></tr></tbody>
 *   </table>
 * </rds-table>
 * ```
 */
@Define({ tag: TAG_TABLE })
@Light()
class RotomecaTable extends BaseElementInternal {
  protected onConnect(): void {
    adoptGlobalStyle(TAG_TABLE, style);
    // Les enfants ne sont pas encore là si l'élément est connecté pendant le parsing.
    whenParsed(this, () => this.#_build());
  }

  /**
   * Trie le corps du tableau selon une colonne.
   *
   * @param column - Index de la colonne.
   * @param direction - Sens du tri (croissant par défaut).
   */
  sort(column: number, direction: SortDirection = 'ascending'): void {
    const table = this.querySelector('table');
    const body = table?.tBodies[0];
    if (!table || !body) return;

    [...table.querySelectorAll('thead th')].forEach((th, index) => {
      const icon = th.querySelector('.rds-sort rds-icon');
      if (index === column) {
        th.setAttribute('aria-sort', direction);
        icon?.setAttribute('name', 'arrow-up');
      } else {
        th.removeAttribute('aria-sort');
        icon?.setAttribute('name', 'arrow-up-down');
      }
    });

    const collator = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' });
    const sign = direction === 'ascending' ? 1 : -1;
    const value = (row: HTMLTableRowElement): string => {
      const cell = row.cells[column];
      return cell ? (cell.dataset.value ?? (cell.textContent ?? '').trim()) : '';
    };
    body.append(...[...body.rows].sort((a, b) => collator.compare(value(a), value(b)) * sign));
    this.emit('rds-table:sort', { column, direction });
  }

  #_build(): void {
    const table = this.querySelector('table');
    if (!table) return;
    // Conteneur défilant focalisable (consultation au clavier).
    if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
    const caption = table.querySelector('caption');
    if (caption) {
      this._p_internal.role = 'region';
      this._p_internal.ariaLabel = (caption.textContent ?? '').trim();
    }

    const sortAll = this.hasAttribute('sortable');
    table.querySelectorAll('thead th').forEach((th, column) => {
      const sortable = sortAll || th.hasAttribute('data-sort');
      if (!sortable || th.hasAttribute('data-nosort') || th.querySelector('.rds-sort')) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'rds-sort';
      button.append(...th.childNodes);
      const icon = document.createElement(RotomecaIcon.tagName);
      icon.setAttribute('name', th.hasAttribute('aria-sort') ? 'arrow-up' : 'arrow-up-down');
      button.append(icon);
      th.append(button);
      button.addEventListener('click', () =>
        this.sort(column, th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending'),
      );
    });
  }
}
