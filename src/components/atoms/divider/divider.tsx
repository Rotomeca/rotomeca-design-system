import { Attr, Define } from '../../../core/scripts/decorators';
import { TAG_DIVIDER } from '../../../core/scripts/utils/tags';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import { hasContent } from '../../base/dom';
import style from './divider.less';

export { RotomecaDivider };
export type { DividerOrientation, DividerSpacing };

type DividerOrientation = 'horizontal' | 'vertical';
type DividerSpacing = 'none' | 'sm' | 'md' | 'lg';

const TEMPLATE = (
  <>
    <span class="line" part="line"></span>
    <span class="label">
      <slot id="s"></slot>
    </span>
    <span class="line end"></span>
  </>
);

/**
 * Séparateur horizontal ou vertical (`role="separator"`), avec libellé centré optionnel.
 *
 * @remarks
 * Préférer l'espace (`--ds-space-*`) à un trait : un séparateur sert à couper des groupes de nature
 * différente (menu, barre d'outils).
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `orientation` | `horizontal` (défaut) · `vertical` | Sens du trait. |
 * | `strong` | booléen | `--ds-border-strong` au lieu de `--ds-border-subtle`. |
 * | `spacing` | `none` · `sm` · *défaut* (16 px) · `lg` | Marge autour du séparateur. |
 *
 * @slot - Libellé centré (ex. « ou »).
 * @csspart line - Les traits.
 * @cssstate has-label - Un libellé est présent.
 *
 * @example
 * ```html
 * <rds-divider>ou</rds-divider>
 * ```
 */
@Define({ tag: TAG_DIVIDER, template: TEMPLATE, styles: style })
class RotomecaDivider extends BaseElementInternal {
  /** Sens du séparateur. */
  @Attr() accessor orientation: DividerOrientation = 'horizontal';
  /** Trait marqué. */
  @Attr() accessor strong: boolean = false;
  /** Marge autour du séparateur. */
  @Attr() accessor spacing: DividerSpacing = 'md';

  static observedAttributes: string[] = ['orientation'];

  protected update(): void {
    if (hasContent(this.require<HTMLSlotElement>('#s'))) this._p_addState('has-label');
    else this._p_removeState('has-label');
    this._p_internal.role = 'separator';
    this._p_internal.ariaOrientation = this.orientation === 'vertical' ? 'vertical' : 'horizontal';
  }

  protected slotChanged(): void {
    this.requestUpdate('slot');
  }
}
