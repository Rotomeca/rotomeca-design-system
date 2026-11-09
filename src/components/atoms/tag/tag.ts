import { Attr, Define } from '../../../core/scripts/decorators';
import { reducedMotion } from '../../../core/scripts/utils/motion';
import { TAG_TAG } from '../../../core/scripts/utils/tags';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import style from './tag.less';

export { RotomecaTag };
export type { TagSize, TagDismissDetail, TagToggleDetail };

type TagSize = 'sm' | 'md';
type TagKind = 'a' | 'button' | 'span';

/** Détail de l'événement `rds-tag:dismiss`. */
interface TagDismissDetail {
  /** Valeur du tag : attribut `value`, sinon son texte. */
  value: string;
}

/** Détail de l'événement `rds-tag:toggle`. */
interface TagToggleDetail {
  selected: boolean;
}

/** Contenu interne d'un tag : coche, icône, texte, bouton de retrait (balisage statique de confiance). */
const INNER_HTML =
  '<rds-icon id="check" name="check"></rds-icon><rds-icon id="icon" hidden></rds-icon><slot></slot>' +
  '<button class="close" type="button" id="close"><rds-icon name="x"></rds-icon></button>';

/**
 * Tag : mot-clé statique, lien vers une catégorie, filtre sélectionnable ou élément supprimable.
 *
 * @remarks
 * L'élément interne dépend du comportement : `<span>` (statique), `<a>` (`href`) ou `<button>`
 * (`selectable`, `aria-pressed`). Il n'est recréé que si ce comportement change.
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | *(rien)* | | Tag statique. |
 * | `href` | URL | Tag lien. |
 * | `selectable` + `selected` | booléens | Filtre : `aria-pressed`, coche. |
 * | `dismissible` | booléen | Bouton × ; Retour arrière / Suppr au clavier. |
 * | `icon` | nom Lucide | Icône devant le texte. |
 * | `size` | `sm` · `md` | 24 / 32 px. |
 * | `disabled` | booléen | Filtre désactivé. |
 * | `value` | texte | Valeur transmise par `rds-tag:dismiss` (défaut : le texte). |
 *
 * Un groupe de filtres est enveloppé d'un `role="group"` avec `aria-label`. Pour un statut,
 * utiliser `rds-badge`.
 *
 * @slot - Texte court du tag.
 * @csspart tag - L'élément interne (`span`, `a` ou `button`).
 * @fires rds-tag:toggle - Filtre basculé ; `detail: { selected }`.
 * @fires rds-tag:dismiss - Retrait demandé (annulable) ; `detail: { value }`.
 * @cssstate selected - Filtre sélectionné.
 *
 * @example
 * ```html
 * <div role="group" aria-label="Filtrer par teinte">
 *   <rds-tag selectable selected>Chaudes</rds-tag><rds-tag selectable>Profondes</rds-tag>
 * </div>
 * ```
 */
@Define({ tag: TAG_TAG, styles: style })
class RotomecaTag extends BaseElementInternal {
  /** Filtre sélectionnable (bouton `aria-pressed`). */
  @Attr() accessor selectable: boolean = false;
  /** Filtre sélectionné. */
  @Attr() accessor selected: boolean = false;
  /** Affiche le bouton de retrait. */
  @Attr() accessor dismissible: boolean = false;
  /** Désactive le filtre. */
  @Attr() accessor disabled: boolean = false;
  /** Taille : `sm` (24 px) ou `md` (32 px, défaut). */
  @Attr() accessor size: TagSize = 'md';

  static shadowOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static observedAttributes: string[] = [
    'href',
    'selectable',
    'selected',
    'dismissible',
    'icon',
    'disabled',
    'size',
  ];

  #_kind: TagKind | '' = '';

  /** Destination d'un tag lien. */
  get href(): string | null {
    return this.getAttribute('href');
  }
  set href(value: string | null) {
    this.setStringAttribute('href', value);
  }

  /** Nom de l'icône devant le texte. */
  get icon(): string {
    return this.stringAttribute('icon');
  }
  set icon(value: string) {
    this.setStringAttribute('icon', value || null);
  }

  protected onConnect(): void {
    this.resources.listen(this.renderRoot, 'click', (event) => {
      const target = event.target as Element;
      if (target.closest?.('#close')) {
        event.stopPropagation();
        this.dismiss();
      } else if (this.#_kind === 'button' && !this.disabled) {
        this.selected = !this.selected;
        this.emit<TagToggleDetail>('rds-tag:toggle', { selected: this.selected });
      }
    });
    this.resources.listen(this, 'keydown', (event) => {
      const key = (event as KeyboardEvent).key;
      if ((key === 'Backspace' || key === 'Delete') && this.dismissible) this.dismiss();
    });
  }

  protected update(): void {
    const kind: TagKind = this.hasAttribute('href')
      ? 'a'
      : this.hasAttribute('selectable')
        ? 'button'
        : 'span';

    if (kind !== this.#_kind) {
      this.#_kind = kind;
      this.renderRoot.querySelector('.tag')?.remove();
      const created = document.createElement(kind);
      created.className = 'tag';
      created.part.add('tag');
      created.innerHTML = INNER_HTML;
      if (created instanceof HTMLButtonElement) created.type = 'button';
      this.renderRoot.append(created);
    }

    const element = this.require('.tag');
    if (element instanceof HTMLAnchorElement) element.href = this.getAttribute('href') ?? '';
    if (element instanceof HTMLButtonElement) {
      element.setAttribute('aria-pressed', String(this.selected));
      element.disabled = this.disabled;
    }

    if (kind === 'button' && this.selected) this._p_addState('selected');
    else this._p_removeState('selected');

    const icon = this.icon;
    const iconElement = this.require('#icon');
    iconElement.hidden = !icon;
    if (icon) iconElement.setAttribute('name', icon);

    this.require('#close').setAttribute('aria-label', `Retirer ${this.textContent?.trim() ?? ''}`);
  }

  /**
   * Retire le tag.
   *
   * @remarks
   * Émet `rds-tag:dismiss` (annulable) ; si personne ne l'annule, le tag disparaît avec un fondu.
   */
  dismiss(): void {
    const value = this.getAttribute('value') ?? this.textContent?.trim() ?? '';
    if (!this.emit<TagDismissDetail>('rds-tag:dismiss', { value }, { cancelable: true })) return;

    const done = (): void => this.remove();
    if (reducedMotion()) {
      done();
      return;
    }
    this.animate(
      [
        { opacity: 1, transform: 'none' },
        { opacity: 0, transform: 'scale(0.8)' },
      ],
      { duration: 150, easing: 'cubic-bezier(0.3, 0, 0.8, 0.15)' },
    ).onfinish = done;
  }
}
