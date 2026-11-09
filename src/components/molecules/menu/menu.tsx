import { Attr, Define } from '../../../core/scripts/decorators';
import { placeFloating, type Placement } from '../../../core/scripts/utils/floating';
import { hideLayer, isLayerOpen, showLayer, supportsPopover } from '../../../core/scripts/utils/layer';
import { TAG_MENU, TAG_MENU_ITEM } from '../../../core/scripts/utils/tags';
import { RotomecaIcon } from '../../atoms/icon/icon';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import menuStyle from './menu.less';
import itemStyle from './menu-item.less';

export { RotomecaMenu, RotomecaMenuItem };

const MENU_TEMPLATE = (
  <>
    <slot name="trigger" id="trigger"></slot>
    <div class="menu" id="menu" role="menu" part="menu">
      <slot name="header"></slot>
      <slot id="items"></slot>
    </div>
  </>
);

const ITEM_TEMPLATE = (
  <div class="item" part="item">
    <RotomecaIcon id="icon" hidden />
    <span class="label">
      <slot></slot>
    </span>
    <span class="shortcut" id="shortcut"></span>
    <RotomecaIcon id="check" name="check" />
  </div>
);

/**
 * Élément de menu (`role="menuitem"`) : icône, raccourci, état coché, variante danger, lien `href`.
 *
 * @remarks
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `icon` | nom Lucide | Icône avant le libellé. |
 * | `shortcut` | texte | Raccourci affiché (non fonctionnel : indication). |
 * | `value` | texte | Valeur transmise (sinon le texte de l'élément). |
 * | `danger` | booléen | Action destructive. |
 * | `disabled` | booléen | Élément inactif. |
 * | `checkable` / `checked` | booléens | Élément à cocher (`menuitemcheckbox`). |
 * | `href` | URL | Navigue après la sélection. |
 *
 * @slot - Libellé.
 * @csspart item - Le conteneur de l'élément.
 * @fires rds-menu-item:select - Élément choisi ; `detail: { value }`.
 */
@Define({ tag: TAG_MENU_ITEM, template: ITEM_TEMPLATE, styles: itemStyle })
class RotomecaMenuItem extends BaseElementInternal {
  /** Action destructive. */
  @Attr() accessor danger: boolean = false;
  /** Élément inactif. */
  @Attr() accessor disabled: boolean = false;
  /** Élément à cocher. */
  @Attr() accessor checkable: boolean = false;
  /** État coché d'un élément à cocher. */
  @Attr() accessor checked: boolean = false;

  static observedAttributes: string[] = [
    'checkable',
    'checked',
    'disabled',
    'danger',
    'icon',
    'shortcut',
  ];

  /** Nom de l'icône. */
  get icon(): string {
    return this.stringAttribute('icon');
  }
  set icon(value: string) {
    this.setStringAttribute('icon', value || null);
  }

  /** Raccourci affiché. */
  get shortcut(): string {
    return this.stringAttribute('shortcut');
  }
  set shortcut(value: string) {
    this.setStringAttribute('shortcut', value || null);
  }

  /** Valeur transmise à la sélection (texte de l'élément par défaut). */
  get value(): string {
    return this.getAttribute('value') ?? (this.textContent ?? '').trim();
  }
  set value(value: string) {
    this.setStringAttribute('value', value);
  }

  protected onConnect(): void {
    this.resources.listen(this, 'click', () => this.#_activate());
    this.resources.listen(this, 'keydown', (event) => {
      const key = (event as KeyboardEvent).key;
      if (key === 'Enter' || key === ' ') {
        event.preventDefault();
        this.#_activate();
      }
    });
  }

  protected update(): void {
    const internals = this._p_internal;
    internals.role = this.checkable ? 'menuitemcheckbox' : 'menuitem';
    if (this.checkable) internals.ariaChecked = String(!!this.checked);
    internals.ariaDisabled = String(!!this.disabled);
    this.tabIndex = -1;
    const icon = this.require('#icon');
    icon.hidden = !this.icon;
    if (this.icon) icon.setAttribute('name', this.icon);
    this.require('#shortcut').textContent = this.shortcut;
  }

  #_activate(): void {
    if (this.disabled) return;
    if (this.checkable) this.checked = !this.checked;
    this.emit('rds-menu-item:select', { value: this.value });
    const href = this.getAttribute('href');
    if (href) window.location.assign(href);
  }
}

/**
 * Menu déroulant : déclencheur (slot `trigger`), éléments `rds-menu-item`, navigation clavier complète.
 *
 * @remarks
 * Positionné et retourné automatiquement, dans le top layer (Popover API, repli `data-open`).
 * Clavier : ↓/↑ depuis le déclencheur ouvre ; ↑↓ / Début / Fin naviguent ; la première lettre saute
 * à l'élément ; Entrée / Espace choisit ; Échap ferme et rend le focus. Un clic extérieur ferme.
 * Animation : fondu + zoom depuis le déclencheur.
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `placement` | `bottom-start` (défaut) · `bottom-end` · `top-start`… | Côté et alignement préférés. |
 *
 * @slot trigger - Le déclencheur (bouton).
 * @slot header - Titre du menu.
 * @slot - Les `rds-menu-item` et `rds-divider`.
 * @csspart menu - Le panneau.
 * @fires rds-menu:select - Élément choisi ; `detail: { value, item }`.
 * @fires rds-menu:open - Ouverture.
 * @fires rds-menu:close - Fermeture.
 *
 * @example
 * ```html
 * <rds-menu>
 *   <rds-secondary-button slot="trigger" icon-after="chevron-down">Actions</rds-secondary-button>
 *   <rds-menu-item icon="pencil" shortcut="Ctrl+E">Modifier</rds-menu-item>
 *   <rds-menu-item icon="trash-2" danger>Supprimer</rds-menu-item>
 * </rds-menu>
 * ```
 */
@Define({ tag: TAG_MENU, template: MENU_TEMPLATE, styles: menuStyle })
class RotomecaMenu extends BaseElementInternal {
  /** Côté et alignement préférés du panneau. */
  @Attr() accessor placement: Placement = 'bottom-start';

  /** `true` si le panneau est ouvert. */
  get open(): boolean {
    return isLayerOpen(this.require('#menu'));
  }

  /** Ouvre le menu et place le focus sur le premier (ou le dernier) élément. */
  show(focus: 'first' | 'last' = 'first'): void {
    const menu = this.require('#menu');
    showLayer(menu);
    placeFloating(menu, this.#_trigger() ?? this, this.placement || 'bottom-start', 4);
    this.#_trigger()?.setAttribute('aria-expanded', 'true');
    const items = this.#_items();
    requestAnimationFrame(() => (focus === 'last' ? items[items.length - 1] : items[0])?.focus());
    this.emit('rds-menu:open', null);
  }

  /** Ferme le menu ; `restoreFocus` rend le focus au déclencheur. */
  close(restoreFocus = false): void {
    if (!this.open) return;
    hideLayer(this.require('#menu'));
    this.#_trigger()?.setAttribute('aria-expanded', 'false');
    if (restoreFocus) this.#_trigger()?.focus();
    this.emit('rds-menu:close', null);
  }

  protected build(): void {
    if (supportsPopover) this.require('#menu').setAttribute('popover', 'manual');
  }

  protected onConnect(): void {
    const { resources } = this;
    const trigger = this.require('#trigger');
    resources.listen(trigger, 'click', () => (this.open ? this.close() : this.show()));
    resources.listen(trigger, 'keydown', (event) => {
      const key = (event as KeyboardEvent).key;
      if (key === 'ArrowDown' || key === 'ArrowUp') {
        event.preventDefault();
        this.show(key === 'ArrowUp' ? 'last' : 'first');
      }
    });
    resources.listen(this.require('#menu'), 'keydown', (event) => this.#_onMenuKey(event as KeyboardEvent));
    resources.listen(this, 'rds-menu-item:select', (event) => {
      const detail = (event as CustomEvent<{ value: string }>).detail;
      this.emit('rds-menu:select', { value: detail.value, item: event.target });
      this.close(true);
    });
    resources.listen(document, 'pointerdown', (event) => {
      if (this.open && !event.composedPath().includes(this)) this.close(false);
    });
    resources.listen(window, 'resize', () => {
      if (this.open) this.close(false);
    });
  }

  protected update(): void {
    const trigger = this.#_trigger();
    if (!trigger) return;
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', String(this.open));
  }

  protected slotChanged(): void {
    this.requestUpdate('slot');
  }

  #_trigger(): HTMLElement | undefined {
    return this.require<HTMLSlotElement>('#trigger').assignedElements()[0] as HTMLElement | undefined;
  }

  #_items(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>(TAG_MENU_ITEM)].filter(
      (item) => !item.hasAttribute('disabled'),
    );
  }

  #_onMenuKey(event: KeyboardEvent): void {
    const items = this.#_items();
    const index = items.indexOf(document.activeElement as HTMLElement);
    const go = (n: number): void => {
      event.preventDefault();
      items[(n + items.length) % items.length]?.focus();
    };
    switch (event.key) {
      case 'ArrowDown':
        go(index + 1);
        break;
      case 'ArrowUp':
        go(index - 1);
        break;
      case 'Home':
        go(0);
        break;
      case 'End':
        go(items.length - 1);
        break;
      case 'Escape':
        event.preventDefault();
        this.close(true);
        break;
      case 'Tab':
        this.close(false);
        break;
      default:
        if (event.key.length === 1) {
          const letter = event.key.toLowerCase();
          const starts = (item: HTMLElement): boolean =>
            (item.textContent ?? '').trim().toLowerCase().startsWith(letter);
          (items.find((item, i) => i > index && starts(item)) ?? items.find(starts))?.focus();
        }
    }
  }
}
