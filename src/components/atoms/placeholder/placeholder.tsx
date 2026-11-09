import { Attr, Define } from '../../../core/scripts/decorators';
import { TAG_PLACEHOLDER } from '../../../core/scripts/utils/tags';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import style from './placeholder.less';

export { RotomecaPlaceholder };
export type { PlaceholderShape };

type PlaceholderShape = 'text' | 'circle' | 'pill' | 'rect';

const TEMPLATE = (
  <>
    <div class="wrap" part="placeholder"></div>
    <span class="sr-only" id="sr"></span>
  </>
);

/** Hauteur par défaut selon la forme. */
const DEFAULT_HEIGHT: Record<PlaceholderShape, string> = {
  text: '1rem',
  pill: '1rem',
  circle: '3rem',
  rect: '8rem',
};

/**
 * Squelette de chargement : réserve la place du contenu à venir et indique l'attente par un reflet.
 *
 * @remarks
 * À utiliser pour un chargement supérieur à 300 ms d'un contenu dont on connaît la forme.
 * Un seul `label` par zone en chargement (sur le premier squelette), pas un par ligne.
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `shape` | `text` (défaut) · `circle` · `pill` · `rect` | Forme. |
 * | `lines` | 1–12 | Nombre de lignes (`text`), la dernière à 60 %. |
 * | `width` / `height` | longueur CSS | Dimensions (défaut : 100 % × 1 rem ; cercle 3 rem ; rect 8 rem). |
 * | `label` | texte | Annoncé (`role="status"`) ; sans libellé, le squelette est décoratif. |
 *
 * @csspart placeholder - Conteneur des formes.
 *
 * @example
 * ```html
 * <rds-placeholder shape="text" lines="3" label="Chargement de l'article"></rds-placeholder>
 * ```
 */
@Define({ tag: TAG_PLACEHOLDER, template: TEMPLATE, styles: style })
class RotomecaPlaceholder extends BaseElementInternal {
  /** Forme : `text` (défaut), `circle`, `pill` ou `rect`. */
  @Attr() accessor shape: PlaceholderShape = 'text';
  /** Nombre de lignes, de 1 à 12 (forme `text`). */
  @Attr() accessor lines: number = 1;

  static observedAttributes: string[] = ['shape', 'lines', 'width', 'height', 'label'];

  /** Largeur (longueur CSS). */
  get width(): string {
    return this.stringAttribute('width');
  }
  set width(value: string) {
    this.setStringAttribute('width', value || null);
  }

  /** Hauteur (longueur CSS). */
  get height(): string {
    return this.stringAttribute('height');
  }
  set height(value: string) {
    this.setStringAttribute('height', value || null);
  }

  /** Libellé annoncé aux lecteurs d'écran. */
  get label(): string {
    return this.stringAttribute('label');
  }
  set label(value: string) {
    this.setStringAttribute('label', value || null);
  }

  protected update(): void {
    const shape = this.shape in DEFAULT_HEIGHT ? this.shape : 'text';
    const count = shape === 'text' ? Math.max(1, Math.min(12, Math.floor(Number(this.lines)) || 1)) : 1;

    // Les lignes ne sont recréées que si leur nombre change.
    const wrap = this.require('.wrap');
    if (wrap.childElementCount !== count) {
      wrap.replaceChildren(
        ...Array.from({ length: count }, () => {
          const bone = document.createElement('span');
          bone.className = 'bone';
          return bone;
        }),
      );
    }

    this.setCSSProperty('--_w', this.width || '100%');
    this.setCSSProperty('--_h', this.height || DEFAULT_HEIGHT[shape]);

    const label = this.label;
    this.require('#sr').textContent = label;
    this._p_internal.role = label ? 'status' : null;
    this._p_internal.ariaHidden = label ? null : 'true';
  }
}
