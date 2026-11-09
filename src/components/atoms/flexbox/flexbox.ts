import { Attr, Define, Light } from '../../../core/scripts/decorators';
import { TAG_FLEX_BOX } from '../../../core/scripts/utils/tags';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import style from './flexbox.less';

export { RotomecaFlexBox };
export type { FlexBoxMode, AlignMode, JustifyMode };

type FlexBoxMode = 'row' | 'column';
/** Valeurs CSS de `align-items` */
type AlignMode =
  | 'normal'
  | 'stretch'
  | 'center'
  | 'start'
  | 'end'
  | 'flex-start'
  | 'flex-end'
  | 'self-start'
  | 'self-end'
  | 'baseline'
  | 'first baseline'
  | 'last baseline'
  | 'safe center'
  | 'unsafe center';

/** Valeurs CSS de `justify-content` */
type JustifyMode =
  | 'normal'
  | 'center'
  | 'start'
  | 'end'
  | 'flex-start'
  | 'flex-end'
  | 'left'
  | 'right'
  | 'space-between'
  | 'space-around'
  | 'space-evenly'
  | 'stretch'
  | 'safe center'
  | 'unsafe center';

/** Pas de l'échelle `--ds-space-*` acceptés par `gap` (ex. `1-5` → `--ds-space-1-5`). */
const SPACE_STEP = /^\d+(?:-\d+)?$/;

/**
 * Conteneur flex déclaratif (light DOM, aucune boîte Shadow) pour assembler les briques sans CSS ad hoc.
 *
 * @remarks
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `mode` | `row` (défaut) · `column` | Direction. |
 * | `inverted` | booléen | Inverse l'ordre (`row-reverse` / `column-reverse`). |
 * | `align` | valeurs de `align-items` | Alignement transversal. |
 * | `justify` | valeurs de `justify-content` | Répartition. |
 * | `gap` | `1` `1-5` `2` `3` `4` `6` `8` `12` (→ `--ds-space-*`) ou longueur CSS | Espacement. |
 * | `wrap` | booléen | Retour à la ligne. |
 *
 * Préférer les pas de l'échelle `--ds-space-*` aux longueurs libres.
 *
 * @cssstate inverted-row - Ordre inversé en ligne.
 * @cssstate inverted-column - Ordre inversé en colonne.
 *
 * @example
 * ```html
 * <rds-flexbox justify="space-between" align="center" gap="2">
 *   <span>Nouveau motif</span>
 *   <rds-primary-button size="sm">Créer</rds-primary-button>
 * </rds-flexbox>
 * ```
 */
@Define({ tag: TAG_FLEX_BOX })
@Light()
class RotomecaFlexBox extends BaseElementInternal {
  @Attr() accessor mode: FlexBoxMode = 'row';
  @Attr() accessor inverted: boolean = false;
  @Attr() accessor align: AlignMode = 'normal';
  @Attr() accessor justify: JustifyMode = 'normal';
  /** Retour à la ligne des enfants. */
  @Attr() accessor wrap: boolean = false;

  static observedAttributes: string[] = ['mode', 'inverted', 'align', 'justify', 'gap', 'wrap'];

  /** Espacement : pas de l'échelle `--ds-space-*` (`2`, `1-5`…) ou longueur CSS. */
  get gap(): string {
    return this.stringAttribute('gap');
  }
  set gap(value: string) {
    this.setStringAttribute('gap', value || null);
  }

  protected onConnect(): void {
    this.#_invertedAttributeChanged();
    this.#_alignUpdated(this.align);
    this.#_justifyUpdated(this.justify);
    this.#_gapUpdated(this.gap);
  }

  protected attributeChanged(
    _name: string,
    _oldValue: string | null,
    _newValue: string | null,
  ): void {
    switch (_name) {
      case 'mode':
      case 'inverted':
        this.#_invertedAttributeChanged();
        break;

      case 'align':
        this.#_alignUpdated(_newValue as AlignMode);
        break;

      case 'justify':
        this.#_justifyUpdated(_newValue as JustifyMode);
        break;

      case 'gap':
        this.#_gapUpdated(_newValue ?? '');
        break;

      default:
        break;
    }
  }

  #_alignUpdated(mode: AlignMode): void {
    this.setCSSProperty('--_align', mode);
  }

  #_justifyUpdated(mode: JustifyMode): void {
    this.setCSSProperty('--_justify', mode);
  }

  #_gapUpdated(gap: string): void {
    const value = gap.trim();
    if (!value) this.setCSSProperty('--_gap', null);
    else this.setCSSProperty('--_gap', SPACE_STEP.test(value) ? `var(--ds-space-${value})` : value);
  }

  #_invertedAttributeChanged(): void {
    this._p_clearStates();

    if (this.inverted) this._p_addState(`inverted-${this.mode}`);
  }
}

window.rotomeca ??= {};
window.rotomeca.rds ??= {};
window.rotomeca.rds.styles ??= {};

// Clé = tag (stable à la minification, contrairement à `RotomecaFlexBox.name`)
if (!window.rotomeca.rds.styles[TAG_FLEX_BOX]) {
  window.rotomeca.rds.styles[TAG_FLEX_BOX] = true;

  const tmp = new CSSStyleSheet();
  tmp.replaceSync(style);

  document.adoptedStyleSheets = [...document.adoptedStyleSheets, tmp];
}
