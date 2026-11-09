import { Attr, Define } from '../../../core/scripts/decorators';
import { reducedMotion } from '../../../core/scripts/utils/motion';
import { TAG_ACCORDION, TAG_ACCORDION_ITEM } from '../../../core/scripts/utils/tags';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import type { UpdateContext } from '../../base/BaseElement';
import { RotomecaIcon } from '../../atoms/icon/icon';
import groupStyle from './accordion.less';
import itemStyle from './accordion-item.less';

export { RotomecaAccordion, RotomecaAccordionItem };

const ITEM_TEMPLATE = (
  <>
    <div class="heading" role="heading" id="heading">
      <button type="button" id="btn" aria-controls="region" part="button">
        <RotomecaIcon id="icon" hidden />
        <span class="label">
          <span id="label-text"></span>
          <slot name="label"></slot>
        </span>
        <RotomecaIcon class="chevron" name="chevron-down" />
      </button>
    </div>
    <div class="region" id="region" role="region" aria-labelledby="btn" part="content">
      <slot></slot>
    </div>
  </>
);

const GROUP_TEMPLATE = <slot></slot>;

/**
 * Élément d'accordéon : en-tête bouton (`aria-expanded`), contenu révélé en fondu.
 *
 * @remarks
 * La hauteur ne s'anime pas (charte) : le contenu apparaît en fondu + glissement de 6 px.
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `label` | texte | Intitulé (ou slot `label`). |
 * | `icon` | nom Lucide | Icône avant l'intitulé. |
 * | `open` | booléen | Section ouverte. |
 * | `disabled` | booléen | Section non interactive. |
 * | `level` | 2 à 6 | Niveau de titre (sinon celui du groupe, sinon 3). |
 *
 * @slot - Contenu de la section.
 * @slot label - Intitulé riche.
 * @csspart button - Le bouton d'en-tête.
 * @csspart content - Le contenu.
 * @fires rds-accordion:toggle - Ouverture ou fermeture ; `detail: { open }`.
 *
 * @example
 * ```html
 * <rds-accordion-item label="Qu'est-ce qu'un token ?" open>…</rds-accordion-item>
 * ```
 */
@Define({
  tag: TAG_ACCORDION_ITEM,
  template: ITEM_TEMPLATE,
  styles: itemStyle,
})
class RotomecaAccordionItem extends BaseElementInternal {
  /** Section ouverte. */
  @Attr() accessor open: boolean = false;
  /** Section non interactive. */
  @Attr() accessor disabled: boolean = false;

  static shadowOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static observedAttributes: string[] = ['open', 'disabled', 'label', 'icon', 'level'];

  /** Intitulé de la section. */
  get label(): string {
    return this.stringAttribute('label');
  }
  set label(value: string) {
    this.setStringAttribute('label', value || null);
  }

  /** Nom de l'icône de l'en-tête. */
  get icon(): string {
    return this.stringAttribute('icon');
  }
  set icon(value: string) {
    this.setStringAttribute('icon', value || null);
  }

  /** Ouvre ou ferme la section (`force` impose l'état). */
  toggle(force?: boolean): void {
    const next = force === undefined ? !this.open : !!force;
    if (next === this.open) return;
    this.open = next;
    this.emit('rds-accordion:toggle', { open: next });
  }

  protected onConnect(): void {
    this.resources.listen(this.require('#btn'), 'click', () => {
      if (!this.disabled) this.toggle();
    });
  }

  protected update(context: UpdateContext): void {
    const open = this.open;
    const button = this.require<HTMLButtonElement>('#btn');
    button.setAttribute('aria-expanded', String(open));
    button.disabled = !!this.disabled;

    const region = this.require('#region');
    const wasOpen = !region.hidden;
    region.hidden = !open;
    if (open && !wasOpen && context.attributes.has('open') && !reducedMotion()) {
      region.animate(
        [
          { opacity: 0, transform: 'translateY(-6px)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 250, easing: 'cubic-bezier(0.05, 0.7, 0.1, 1)' },
      );
    }

    this.require('#label-text').textContent = this.label;
    const group = this.closest(TAG_ACCORDION);
    this.require('#heading').setAttribute(
      'aria-level',
      group?.getAttribute('level') || this.getAttribute('level') || '3',
    );
    const icon = this.require('#icon');
    icon.hidden = !this.icon;
    if (this.icon) icon.setAttribute('name', this.icon);
  }
}

/**
 * Groupe d'accordéons ; `single` n'autorise qu'une section ouverte à la fois.
 *
 * @remarks
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `single` | booléen | Une seule section ouverte à la fois. |
 * | `level` | 2 à 6 (3) | Niveau de titre des en-têtes. |
 * | `variant` | `contained` | Fond teinté autour du groupe. |
 *
 * @slot - Les `rds-accordion-item`.
 *
 * @example
 * ```html
 * <rds-accordion single>
 *   <rds-accordion-item label="Première" open>…</rds-accordion-item>
 *   <rds-accordion-item label="Seconde">…</rds-accordion-item>
 * </rds-accordion>
 * ```
 */
@Define({ tag: TAG_ACCORDION, template: GROUP_TEMPLATE, styles: groupStyle })
class RotomecaAccordion extends BaseElementInternal {
  /** Une seule section ouverte à la fois. */
  @Attr() accessor single: boolean = false;
  /** Variante : `contained` pour un fond teinté. */
  @Attr() accessor variant: string = '';

  static observedAttributes: string[] = ['level'];

  protected onConnect(): void {
    this.resources.listen(this, 'rds-accordion:toggle', (event) => {
      const { open } = (event as CustomEvent<{ open: boolean }>).detail;
      if (!this.single || !open) return;
      for (const item of this.querySelectorAll<RotomecaAccordionItem>(
        `:scope > ${TAG_ACCORDION_ITEM}[open]`,
      )) {
        if (item !== event.target) item.open = false;
      }
    });
  }

  protected attributeChanged(name: string): void {
    // Le niveau est lu par les éléments : on leur demande de se mettre à jour.
    if (name === 'level') {
      for (const item of this.querySelectorAll<RotomecaAccordionItem>(`:scope > ${TAG_ACCORDION_ITEM}`))
        item.requestUpdate?.('level');
    }
  }
}
