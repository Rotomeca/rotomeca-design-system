import { Attr, Define } from '../../../core/scripts/decorators';
import { TAG_LINK } from '../../../core/scripts/utils/tags';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import { RotomecaIcon } from '../icon/icon';
import style from './link.less';

export { RotomecaLink };
export type { LinkVariant, LinkSize };

type LinkVariant = '' | 'standalone' | 'muted';
type LinkSize = '' | 'sm' | 'lg';

/** Attributs recopiés tels quels sur le `<a>` interne. */
const COPIED_ATTRIBUTES = ['download', 'hreflang', 'type'] as const;

const TEMPLATE = (
  <a id="a" part="link">
    <RotomecaIcon id="before" hidden />
    <slot></slot>
    <RotomecaIcon id="after" hidden />
    <RotomecaIcon id="ext" name="external-link" hidden />
    <span class="sr-only" id="sr"></span>
  </a>
);

/**
 * Lien du design system : un vrai `<a>` dont le soulignement s'épaissit au survol.
 *
 * @remarks
 * Un lien `external` s'ouvre dans un nouvel onglet (`rel="noopener noreferrer"`), affiche une icône
 * et annonce « (nouvelle fenêtre) » aux lecteurs d'écran.
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `href` | URL | Destination. |
 * | `external` | booléen | Nouvel onglet, icône `external-link`, texte masqué « (nouvelle fenêtre) ». |
 * | `variant` | *(défaut)* · `standalone` · `muted` | Dans le texte ; autonome (gras) ; discret. |
 * | `icon-before` / `icon-after` | nom Lucide | Icône ; celle d'après glisse au survol. |
 * | `size` | `sm` · `lg` | Taille du texte. |
 * | `download`, `hreflang`, `type`, `aria-current` | | Recopiés sur le `<a>`. |
 * | `no-visited` | booléen | Pas de couleur « déjà visité ». |
 *
 * @slot - Intitulé du lien (explicite hors contexte, jamais « cliquez ici »).
 * @csspart link - Le `<a>` natif.
 *
 * @example
 * ```html
 * <p>Consultez <rds-link href="/guide">le guide des motifs</rds-link>.</p>
 * <rds-link href="https://lucide.dev" external>Bibliothèque d'icônes</rds-link>
 * ```
 */
@Define({ tag: TAG_LINK, template: TEMPLATE, styles: style })
class RotomecaLink extends BaseElementInternal {
  /** Lien externe : nouvel onglet et signalement. */
  @Attr() accessor external: boolean = false;
  /** Variation : défaut (souligné), `standalone` ou `muted`. */
  @Attr() accessor variant: LinkVariant = '';
  /** Taille du texte : défaut, `sm` ou `lg`. */
  @Attr() accessor size: LinkSize = '';
  /** Pas de couleur « déjà visité ». */
  @Attr('no-visited') accessor noVisited: boolean = false;

  static shadowOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static observedAttributes: string[] = [
    'href',
    'target',
    'external',
    'download',
    'hreflang',
    'type',
    'icon-before',
    'icon-after',
    'aria-current',
    'variant',
  ];

  /** Destination du lien. */
  get href(): string | null {
    return this.getAttribute('href');
  }
  set href(value: string | null) {
    this.setStringAttribute('href', value);
  }

  /** Nom de l'icône avant le texte. */
  get iconBefore(): string {
    return this.stringAttribute('icon-before');
  }
  set iconBefore(value: string) {
    this.setStringAttribute('icon-before', value || null);
  }

  /** Nom de l'icône après le texte. */
  get iconAfter(): string {
    return this.stringAttribute('icon-after');
  }
  set iconAfter(value: string) {
    this.setStringAttribute('icon-after', value || null);
  }

  protected update(): void {
    const a = this.require<HTMLAnchorElement>('#a');
    const href = this.getAttribute('href');
    if (href === null) a.removeAttribute('href');
    else a.href = href;

    const external = this.hasAttribute('external');
    a.target = external ? '_blank' : this.getAttribute('target') || '';
    if (a.target === '_blank') a.rel = 'noopener noreferrer';
    else a.removeAttribute('rel');

    for (const name of COPIED_ATTRIBUTES) {
      const value = this.getAttribute(name);
      if (value === null) a.removeAttribute(name);
      else a.setAttribute(name, value);
    }

    const current = this.getAttribute('aria-current');
    if (current) a.setAttribute('aria-current', current);
    else a.removeAttribute('aria-current');

    this.#_syncIcon('before', this.iconBefore);
    this.#_syncIcon('after', this.iconAfter);
    this.require('#ext').hidden = !external;
    this.require('#sr').textContent = external ? ' (nouvelle fenêtre)' : '';
  }

  #_syncIcon(id: string, name: string): void {
    const icon = this.require(`#${id}`);
    icon.hidden = !name;
    if (name) icon.setAttribute('name', name);
  }
}
