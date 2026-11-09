import { Define, Light } from '../../../core/scripts/decorators';
import { adoptGlobalStyle } from '../../../core/scripts/utils/globalStyle';
import { TAG_BREADCRUMB } from '../../../core/scripts/utils/tags';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import { whenParsed } from '../../base/dom';
import { RotomecaIcon } from '../../atoms/icon/icon';
import style from './breadcrumb.less';

export { RotomecaBreadcrumb };

/**
 * Fil d'Ariane : les liens enfants sont mis en liste (`<ol>`), séparés par des chevrons ; le dernier
 * élément devient la page courante (`aria-current="page"`).
 *
 * @remarks
 * Composant en light DOM : les liens restent ceux du consommateur (routeur, écouteurs).
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `label` | texte (défaut « Vous êtes ici : ») | Nom accessible de la navigation. |
 * | `max` | nombre | Replie les niveaux intermédiaires derrière un bouton « … ». |
 *
 * @example
 * ```html
 * <rds-breadcrumb max="4">
 *   <a href="/">Accueil</a><a href="/palettes">Palettes</a><span>Automne</span>
 * </rds-breadcrumb>
 * ```
 */
@Define({ tag: TAG_BREADCRUMB })
@Light()
class RotomecaBreadcrumb extends BaseElementInternal {
  static observedAttributes: string[] = ['label'];

  /** Nom accessible de la navigation. */
  get label(): string {
    return this.stringAttribute('label');
  }
  set label(value: string) {
    this.setStringAttribute('label', value || null);
  }

  protected onConnect(): void {
    adoptGlobalStyle(TAG_BREADCRUMB, style);
    this._p_internal.role = 'navigation';
    this._p_internal.ariaLabel = this.label || 'Vous êtes ici :';
    // Les enfants ne sont pas encore là si l'élément est connecté pendant le parsing.
    whenParsed(this, () => this.#_build());
  }

  protected attributeChanged(name: string): void {
    if (name === 'label') this._p_internal.ariaLabel = this.label || 'Vous êtes ici :';
  }

  #_build(): void {
    if (!this.querySelector(':scope > ol')) {
      const items = [...this.children].filter((child) => child.matches('a, span'));
      const list = document.createElement('ol');
      items.forEach((item, index) => {
        const entry = document.createElement('li');
        if (index > 0) entry.append(this.#_separator());
        entry.append(item);
        list.append(entry);
      });
      const last = items[items.length - 1];
      if (last && !last.hasAttribute('aria-current')) last.setAttribute('aria-current', 'page');
      this.append(list);
    }
    this.#_collapse();
  }

  #_separator(): HTMLElement {
    const separator = document.createElement(RotomecaIcon.tagName);
    separator.setAttribute('name', 'chevron-right');
    return separator;
  }

  #_collapse(): void {
    const max = this.numberAttribute('max');
    const entries = [...this.querySelectorAll(':scope > ol > li')];
    if (!max || entries.length <= max || this.querySelector('.rds-bc-more')) return;

    const hidden = entries.slice(1, entries.length - (max - 1));
    for (const entry of hidden) entry.classList.add('rds-bc-hidden');

    const more = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'rds-bc-more';
    button.setAttribute('aria-label', "Afficher tout le fil d'Ariane");
    button.textContent = '…';
    more.append(this.#_separator(), button);
    entries[0].after(more);

    button.addEventListener(
      'click',
      () => {
        for (const entry of hidden) entry.classList.remove('rds-bc-hidden');
        more.remove();
        hidden[0]?.querySelector('a')?.focus();
      },
      { once: true },
    );
  }
}
