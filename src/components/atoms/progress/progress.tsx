import { Attr, Define } from '../../../core/scripts/decorators';
import { TAG_PROGRESS } from '../../../core/scripts/utils/tags';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import { hasContent } from '../../base/dom';
import style from './progress.less';

export { RotomecaProgress };
export type { ProgressTone, ProgressSize };

type ProgressTone = '' | 'success' | 'warning' | 'danger';
type ProgressSize = 'sm' | 'md' | 'lg';

const TEMPLATE = (
  <>
    <div class="head">
      <span class="label" id="label">
        <slot id="label-slot"></slot>
      </span>
      <span class="value" id="value"></span>
    </div>
    <div class="track" part="track">
      <div class="bar" part="bar"></div>
    </div>
  </>
);

/**
 * Barre de progression linéaire, déterminée (`value` / `max`) ou indéterminée (sans `value`).
 *
 * @remarks
 * Expose `role="progressbar"` avec `aria-valuenow` / `aria-valuetext` par `ElementInternals`.
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `value` / `max` | nombres (max : 100) | Avancement ; `value` absent = indéterminé. |
 * | `show-value` | booléen | Pourcentage affiché à droite du libellé. |
 * | `tone` | `success` · `warning` · `danger` | Couleur de remplissage. |
 * | `size` | `sm` · `md` · `lg` | 4 / 8 / 12 px. |
 * | `label` | texte | Nom accessible (sinon le texte du slot). |
 *
 * @slot - Libellé de la barre.
 * @csspart track - La piste.
 * @csspart bar - Le remplissage.
 * @cssstate indeterminate - Barre sans valeur.
 *
 * @example
 * ```html
 * <rds-progress value="64" show-value>Import des motifs</rds-progress>
 * ```
 */
@Define({ tag: TAG_PROGRESS, template: TEMPLATE, styles: style })
class RotomecaProgress extends BaseElementInternal {
  /** Couleur de remplissage : défaut, `success`, `warning` ou `danger`. */
  @Attr() accessor tone: ProgressTone = '';
  /** Épaisseur : `sm`, `md` (défaut) ou `lg`. */
  @Attr() accessor size: ProgressSize = 'md';
  /** Affiche le pourcentage. */
  @Attr('show-value') accessor showValue: boolean = false;

  static observedAttributes: string[] = ['value', 'max', 'show-value', 'label'];

  /** Valeur courante, ou `null` si la barre est indéterminée. */
  get value(): number | null {
    const raw = this.getAttribute('value');
    return raw === null || raw === '' ? null : Number(raw);
  }
  set value(value: number | null) {
    this.setStringAttribute('value', value);
  }

  /** Valeur maximale (défaut : 100). */
  get max(): number {
    return this.numberAttribute('max', 100) || 100;
  }
  set max(value: number) {
    this.setStringAttribute('max', value);
  }

  /** Nom accessible, à défaut le texte du slot. */
  get label(): string {
    return this.stringAttribute('label');
  }
  set label(value: string) {
    this.setStringAttribute('label', value || null);
  }

  protected update(): void {
    const raw = this.value;
    const max = this.max;
    const indeterminate = raw === null || Number.isNaN(raw);
    if (indeterminate) this._p_addState('indeterminate');
    else this._p_removeState('indeterminate');

    const value = indeterminate ? 0 : Math.max(0, Math.min(max, raw));
    this.setCSSProperty('--_p', String(value / max));
    const percent = Math.round((value / max) * 100);
    const showValue = this.hasAttribute('show-value') && !indeterminate;
    this.require('#value').textContent = showValue ? `${percent} %` : '';

    if (hasContent(this.require<HTMLSlotElement>('#label-slot')) || showValue)
      this._p_addState('has-head');
    else this._p_removeState('has-head');

    const internals = this._p_internal;
    internals.role = 'progressbar';
    internals.ariaValueMin = '0';
    internals.ariaValueMax = String(max);
    internals.ariaValueNow = indeterminate ? null : String(value);
    internals.ariaValueText = indeterminate ? 'Chargement en cours' : `${percent} %`;
    internals.ariaLabel = this.label || this.textContent?.trim() || null;
  }

  protected slotChanged(): void {
    this.requestUpdate('slot');
  }
}
