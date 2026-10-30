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

@Define({ tag: TAG_FLEX_BOX })
@Light()
class RotomecaFlexBox extends BaseElementInternal {
  @Attr() accessor mode: FlexBoxMode = 'row';
  @Attr() accessor inverted: boolean = false;
  @Attr() accessor align: AlignMode = 'normal';
  @Attr() accessor justify: JustifyMode = 'normal';

  static observedAttributes: string[] = ['mode', 'inverted', 'align', 'justify'];

  protected onConnect(): void {
    this.#_invertedAttributeChanged();
    this.#_alignUpdated(this.align);
    this.#_justifyUpdated(this.justify);
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
