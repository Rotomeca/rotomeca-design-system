import { Attr, Define } from '../../../core/scripts/decorators';
import { TAG_ICON } from '../../../core/scripts/utils/tags';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import style from './icon.less';

export { RotomecaIcon, registerIcons, setIconsPath };
export type { IconSize };

/** Tailles prédéfinies. Toute autre valeur (`32px`, `2rem`…) est utilisée telle quelle. */
type IconSize = 'sm' | 'md' | 'lg' | (string & {});

const PRESET_SIZES: readonly string[] = ['sm', 'md', 'lg'];

/** Registre des icônes enregistrées à la main (nom → balisage SVG). */
const ICONS = new Map<string, string>();

/** Icônes chargées à la demande (nom → balisage SVG, ou `null` si introuvable). */
const LOADED = new Map<string, Promise<string | null>>();

/** Nom d'icône valide : évite toute sortie du dossier d'icônes. */
const VALID_NAME = /^[a-z0-9-]+$/;

/** Dossier des icônes : `icons/` à côté du module (`dist/icons/` ou `out/icons/`). */
let iconsPath = new URL('./icons/', import.meta.url).href;

/**
 * Définit le dossier d'où sont chargées les icônes par nom (`<name>.svg`).
 *
 * @remarks
 * Par défaut, `icons/` à côté du module. À utiliser quand un bundler déplace le module,
 * ou pour servir les icônes depuis un CDN ou un dossier `public/`.
 *
 * @param path - URL ou chemin du dossier.
 */
function setIconsPath(path: string): void {
  iconsPath = path.endsWith('/') ? path : `${path}/`;
  LOADED.clear();

  for (const icon of document.querySelectorAll<RotomecaIcon>(TAG_ICON)) icon.requestUpdate('icons');
}

function loadIcon(name: string): Promise<string | null> {
  let promise = LOADED.get(name);

  if (!promise) {
    promise = fetch(`${iconsPath}${name}.svg`)
      .then((response) => (response.ok ? response.text() : null))
      .catch(() => null);
    LOADED.set(name, promise);
  }

  return promise;
}

/**
 * Enregistre des icônes personnalisées utilisables via `<rds-icon name="...">`.
 *
 * @remarks
 * Les icônes Lucide n'ont pas besoin d'être enregistrées : elles sont chargées par nom.
 * Une icône enregistrée prend le pas sur une icône Lucide du même nom.
 * Le balisage est considéré comme fiable (il vient du code, jamais d'un attribut).
 *
 * @param icons - Table nom → chaîne SVG.
 * @example
 * ```ts
 * registerIcons({ logo: '<svg viewBox="0 0 24 24">…</svg>' });
 * ```
 */
function registerIcons(icons: Record<string, string>): void {
  for (const [name, svg] of Object.entries(icons)) ICONS.set(name, svg);

  for (const icon of document.querySelectorAll<RotomecaIcon>(TAG_ICON)) icon.requestUpdate('icons');
}

@Define({ tag: TAG_ICON, styles: style })
class RotomecaIcon extends BaseElementInternal {
  /** Nom de l'icône enregistrée. */
  @Attr() accessor name: string = '';
  /** Taille : `sm`, `md`, `lg` ou une longueur CSS. */
  @Attr() accessor size: IconSize = 'md';
  /** Libellé accessible. Sans libellé, l'icône est décorative (`aria-hidden`). */
  @Attr() accessor label: string = '';

  static observedAttributes: string[] = ['name', 'size', 'label'];

  protected update(): void {
    this.#_renderIcon();
    this.#_applySize();
    this.#_applyLabel();
  }

  #_renderIcon(): void {
    const root = this.renderRoot;
    const name = this.name;
    const source = ICONS.get(name);
    const current = root.querySelector('svg');

    if (!source) {
      current?.remove();
      if (VALID_NAME.test(name)) void this.#_loadAndRefresh(name);
      return;
    }

    this.#_mount(source, current);
  }

  async #_loadAndRefresh(name: string): Promise<void> {
    const source = await loadIcon(name);

    // Le nom a pu changer pendant le chargement.
    if (source && name === this.name && !ICONS.has(name)) {
      this.#_mount(source, this.renderRoot.querySelector('svg'));
      this.#_applyLabel();
    }
  }

  #_mount(source: string, current: SVGSVGElement | null): void {
    const root = this.renderRoot;
    const template = document.createElement('template');
    template.innerHTML = source;
    const svg = template.content.querySelector('svg');

    if (!svg) {
      current?.remove();
      return;
    }

    // La taille est pilotée par le CSS du composant.
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    current ? current.replaceWith(svg) : root.append(svg);
  }

  #_applySize(): void {
    const size = String(this.size);
    this.setCSSProperty('--_size', PRESET_SIZES.includes(size) ? null : size);
  }

  #_applyLabel(): void {
    if (this.label) {
      this.setAttribute('role', 'img');
      this.setAttribute('aria-label', this.label);
      this.removeAttribute('aria-hidden');
    } else {
      this.removeAttribute('role');
      this.removeAttribute('aria-label');
      this.setAttribute('aria-hidden', 'true');
    }
  }
}
