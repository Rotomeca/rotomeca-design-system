import type { ResourceScope } from '../../../components/base/ResourceScope';
import { placeFloating, type Placement } from './floating';
import { hideLayer, isLayerOpen, showLayer, supportsPopover } from './layer';

/** Délai d'ouverture au survol, en millisecondes. */
const HOVER_DELAY = 400;
/** Délai de fermeture à la sortie du survol, en millisecondes. */
const LEAVE_DELAY = 100;

/**
 * Contrôleur d'infobulle partagé par `rds-tooltip` et `rds-helper`.
 *
 * @remarks
 * Survol (400 ms, hors tactile), focus, Échap, fermeture au défilement. Les écouteurs
 * sont enregistrés dans la {@link ResourceScope} fournie : ils sont nettoyés au disconnect.
 */
export class TipController {
  #show: ReturnType<typeof setTimeout> | undefined;
  #hide: ReturnType<typeof setTimeout> | undefined;

  /**
   * @param host - Élément qui reçoit les événements de survol et de focus.
   * @param tip - Élément de l'infobulle.
   * @param getAnchor - Renvoie l'ancre de positionnement.
   * @param getPlacement - Renvoie le placement souhaité.
   */
  constructor(
    private readonly host: HTMLElement,
    private readonly tip: HTMLElement,
    private readonly getAnchor: () => Element,
    private readonly getPlacement: () => Placement,
  ) {
    if (supportsPopover) tip.setAttribute('popover', 'manual');
  }

  /**
   * Branche les écouteurs ; à appeler à chaque connexion.
   *
   * @param scope - Portée de ressources de l'hôte.
   */
  connect(scope: ResourceScope): void {
    const h = this.host;
    scope.listen(h, 'pointerenter', (e) => {
      if (e.pointerType !== 'touch') this.open(HOVER_DELAY);
    });
    scope.listen(h, 'pointerleave', () => this.close(LEAVE_DELAY));
    scope.listen(h, 'focusin', () => this.open(0));
    scope.listen(h, 'focusout', () => this.close(0));
    scope.listen(h, 'keydown', (e) => {
      if (e.key === 'Escape' && isLayerOpen(this.tip)) {
        e.stopPropagation();
        this.close(0);
      }
    });
    scope.listen(window, 'scroll', () => this.close(0), { passive: true, capture: true });
    scope.own(() => this.#clear());
  }

  /**
   * Ouvre l'infobulle après un délai ; sans contenu, ne fait rien.
   *
   * @param delay - Délai en millisecondes.
   */
  open(delay: number): void {
    this.#clear();
    this.#show = setTimeout(() => {
      const slot = this.tip.querySelector('slot');
      if (!this.tip.textContent?.trim() && !slot?.assignedNodes().length) return;
      showLayer(this.tip);
      placeFloating(this.tip, this.getAnchor(), this.getPlacement(), 8);
    }, delay);
  }

  /**
   * Ferme l'infobulle après un délai.
   *
   * @param delay - Délai en millisecondes.
   */
  close(delay: number): void {
    this.#clear();
    this.#hide = setTimeout(() => hideLayer(this.tip), delay);
  }

  /** Bascule l'infobulle (usage tactile). */
  toggle(): void {
    if (isLayerOpen(this.tip)) this.close(0);
    else this.open(0);
  }

  #clear(): void {
    clearTimeout(this.#show);
    clearTimeout(this.#hide);
  }
}
