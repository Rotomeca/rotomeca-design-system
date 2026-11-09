import { Attr, Define, Light } from '../../../core/scripts/decorators';
import { reducedMotion } from '../../../core/scripts/utils/motion';
import { TAG_TAB_PANEL, TAG_TABS } from '../../../core/scripts/utils/tags';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import { RotomecaIcon } from '../../atoms/icon/icon';
import style from './tabs.less';

export { RotomecaTabs, RotomecaTabPanel };

const TEMPLATE = (
  <>
    <div class="bar" role="tablist" part="tablist" id="bar">
      <span class="indicator" part="indicator"></span>
    </div>
    <div class="panels">
      <slot id="panels"></slot>
    </div>
  </>
);

/**
 * Onglets : la barre est générée depuis les `rds-tab-panel` enfants ; un indicateur glisse sous
 * l'onglet actif ; motif ARIA complet (`tablist` / `tab` / `tabpanel`).
 *
 * @remarks
 * Clavier : ←/→ (circulaire), Début, Fin. L'indicateur est un élément de 1 px mis à l'échelle
 * (`translateX` + `scaleX`) pour n'animer que `transform`. Le panneau apparaît en fondu.
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `variant` | `pills` | Onglets en pastilles, sans indicateur. |
 * | `full` | booléen | Onglets de largeur égale. |
 * | `selected` | index | Index initial (sinon le panneau portant `selected`). |
 *
 * @slot - Les `rds-tab-panel`.
 * @csspart tablist - La barre d'onglets.
 * @csspart indicator - L'indicateur glissant.
 * @fires rds-tabs:change - Onglet changé par l'utilisateur ; `detail: { index, panel }`.
 *
 * @example
 * ```html
 * <rds-tabs>
 *   <rds-tab-panel label="Couleurs">…</rds-tab-panel>
 *   <rds-tab-panel label="Typographie">…</rds-tab-panel>
 * </rds-tabs>
 * ```
 */
@Define({ tag: TAG_TABS, template: TEMPLATE, styles: style })
class RotomecaTabs extends BaseElementInternal {
  /** Variante : `pills` pour des onglets en pastilles. */
  @Attr() accessor variant: string = '';
  /** Onglets de largeur égale. */
  @Attr() accessor full: boolean = false;

  static observedAttributes: string[] = [];

  #_index = -1;

  /** Index de l'onglet sélectionné. */
  get selectedIndex(): number {
    return this.#_index;
  }
  set selectedIndex(index: number) {
    this.select(index);
  }

  /** Sélectionne l'onglet `index` ; `notify` émet `rds-tabs:change`. */
  select(index: number, notify = false): void {
    const panels = this.#_panels();
    if (!panels.length) return;
    const next = Math.max(0, Math.min(panels.length - 1, index));
    const changed = next !== this.#_index;
    this.#_index = next;

    const buttons = this.#_buttons();
    buttons.forEach((button, i) => {
      button.setAttribute('aria-selected', String(i === next));
      button.tabIndex = i === next ? 0 : -1;
    });
    panels.forEach((panel, i) => {
      const wasVisible = !panel.hidden;
      panel.hidden = i !== next;
      panel.tabIndex = 0;
      if (i === next && !wasVisible && changed && notify && !reducedMotion()) {
        panel.animate(
          [
            { opacity: 0, transform: 'translateY(4px)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 200, easing: 'cubic-bezier(0.05, 0.7, 0.1, 1)' },
        );
      }
    });
    this.#_moveIndicator();
    if (changed && notify) this.emit('rds-tabs:change', { index: next, panel: panels[next] });
  }

  protected onConnect(): void {
    const bar = this.require('#bar');
    this.resources.listen(bar, 'click', (event) => {
      const button = (event.target as Element).closest('button');
      if (button) this.select(Number(button.dataset.index), true);
    });
    this.resources.listen(bar, 'keydown', (event) => {
      const buttons = this.#_buttons().filter((button) => !button.disabled);
      const current = buttons.indexOf((this.renderRoot as ShadowRoot).activeElement as HTMLButtonElement);
      let next: HTMLButtonElement | undefined;
      switch ((event as KeyboardEvent).key) {
        case 'ArrowRight':
          next = buttons[(current + 1) % buttons.length];
          break;
        case 'ArrowLeft':
          next = buttons[(current - 1 + buttons.length) % buttons.length];
          break;
        case 'Home':
          next = buttons[0];
          break;
        case 'End':
          next = buttons[buttons.length - 1];
          break;
        default:
          return;
      }
      event.preventDefault();
      next.focus();
      this.select(Number(next.dataset.index), true);
    });
    this.observeResize(this, () => this.#_moveIndicator());
  }

  protected slotChanged(): void {
    this.requestUpdate('slot');
  }

  protected update(): void {
    const panels = this.#_panels();
    const bar = this.require('#bar');
    bar.querySelectorAll('button').forEach((button) => button.remove());
    this.id ||= `rds-tabs-${Math.random().toString(36).slice(2, 8)}`;
    const uid = this.id;

    panels.forEach((panel, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('role', 'tab');
      button.dataset.index = String(i);
      button.id = `${uid}-tab-${i}`;
      button.disabled = panel.hasAttribute('disabled');
      const iconName = panel.getAttribute('icon');
      if (iconName) {
        const icon = document.createElement(RotomecaIcon.tagName);
        icon.setAttribute('name', iconName);
        button.append(icon);
      }
      button.append(panel.getAttribute('label') || `Onglet ${i + 1}`);
      bar.append(button);
      panel.id ||= `${uid}-panel-${i}`;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-label', panel.getAttribute('label') || '');
      button.setAttribute('aria-controls', panel.id);
    });

    let index = this.#_index;
    if (index < 0 || index >= panels.length) {
      index = panels.findIndex((panel) => panel.hasAttribute('selected'));
      if (index < 0) index = this.numberAttribute('selected', 0);
    }
    this.#_index = -1;
    this.select(index, false);
  }

  #_panels(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>(`:scope > ${TAG_TAB_PANEL}`)];
  }

  #_buttons(): HTMLButtonElement[] {
    return [...this.require('#bar').querySelectorAll('button')];
  }

  #_moveIndicator(): void {
    const button = this.#_buttons()[this.#_index];
    if (!button) return;
    const indicator = this.require('.indicator');
    indicator.style.setProperty('--_x', `${button.offsetLeft}px`);
    indicator.style.setProperty('--_w', String(button.offsetWidth));
  }
}

/**
 * Panneau d'onglet, enfant de `rds-tabs`.
 *
 * @remarks
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `label` | texte | Libellé de l'onglet. |
 * | `icon` | nom Lucide | Icône de l'onglet. |
 * | `selected` | booléen | Onglet affiché initialement. |
 * | `disabled` | booléen | Onglet désactivé. |
 *
 * @slot - Contenu du panneau.
 */
@Define({ tag: TAG_TAB_PANEL })
@Light()
class RotomecaTabPanel extends BaseElementInternal {
  static observedAttributes: string[] = ['label', 'icon', 'disabled'];

  protected attributeChanged(): void {
    // Le parent régénère sa barre ; absent ou pas encore défini, rien à faire.
    (this.closest(TAG_TABS) as RotomecaTabs | null)?.requestUpdate?.('panel');
  }
}
