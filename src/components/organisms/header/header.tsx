import { Define } from '../../../core/scripts/decorators';
import { adoptGlobalStyle } from '../../../core/scripts/utils/globalStyle';
import { TAG_HEADER } from '../../../core/scripts/utils/tags';
import { RotomecaIconButton } from '../../atoms/icon-button/icon-button';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import style from './header.less';
import globalStyle from './header-global.less';

export { RotomecaHeader };

const TEMPLATE = (
  <header part="header">
    <div class="inner">
      <div class="brand">
        <slot name="brand"></slot>
      </div>
      <div class="nav" id="nav">
        <slot name="nav"></slot>
      </div>
      <div class="actions">
        <slot name="actions"></slot>
      </div>
      <RotomecaIconButton id="burger" icon="menu" label="Menu" toggle />
    </div>
  </header>
);

/**
 * En-tête de site : marque, navigation, actions ; la navigation se replie derrière un bouton menu
 * sous 768 px de large (requête de conteneur) ; collant avec ombre au défilement (`sticky`).
 *
 * @remarks
 * Les liens slottés restent en light DOM (routeur, écouteurs) ; leur style vient d'une feuille globale.
 * Animation : ombre `--ds-shadow-2` qui apparaît au défilement, panneau mobile en fondu.
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `sticky` | booléen | Collant, ombre au défilement. |
 * | `menu-label` | texte (défaut « Menu ») | Nom accessible du bouton de menu mobile. |
 *
 * @slot brand - Lien d'accueil avec logo / nom.
 * @slot nav - Un `<nav>` de liens (`aria-current="page"` sur la page courante).
 * @slot actions - Recherche, avatar, `rds-theme-switcher`…
 * @csspart header - Le conteneur.
 * @cssstate scrolled - Page défilée (avec `sticky`).
 * @cssstate menu-open - Menu mobile ouvert.
 *
 * @example
 * ```html
 * <rds-header sticky>
 *   <a slot="brand" href="/">Rotomeca</a>
 *   <nav slot="nav"><a href="/" aria-current="page">Accueil</a><a href="/palettes">Palettes</a></nav>
 *   <rds-icon-button slot="actions" icon="search" label="Rechercher"></rds-icon-button>
 * </rds-header>
 * ```
 */
@Define({ tag: TAG_HEADER, template: TEMPLATE, styles: style })
class RotomecaHeader extends BaseElementInternal {
  static observedAttributes: string[] = ['sticky', 'menu-label'];

  /** Nom accessible du bouton de menu mobile. */
  get menuLabel(): string {
    return this.stringAttribute('menu-label');
  }
  set menuLabel(value: string) {
    this.setStringAttribute('menu-label', value || null);
  }

  protected onConnect(): void {
    adoptGlobalStyle(TAG_HEADER, globalStyle);
    const burger = this.require('#burger');
    this.resources.listen(burger, 'rds-icon-button:toggle', (event) => {
      const selected = (event as CustomEvent<{ selected: boolean }>).detail.selected;
      if (selected) this._p_addState('menu-open');
      else this._p_removeState('menu-open');
      burger.setAttribute('icon', selected ? 'x' : 'menu');
    });
    const onScroll = (): void => {
      if (this.hasAttribute('sticky') && window.scrollY > 4) this._p_addState('scrolled');
      else this._p_removeState('scrolled');
    };
    this.resources.listen(window, 'scroll', onScroll, { passive: true });
    onScroll();
  }

  protected update(): void {
    this.require('#burger').setAttribute('label', this.menuLabel || 'Menu');
    this.require('#nav').setAttribute('aria-label', 'Menu principal');
  }
}
