/** Vrai si la Popover API est disponible. */
export const supportsPopover: boolean =
  typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.showPopover === 'function';

/**
 * Affiche une couche flottante (Popover API, repli : attribut `data-open`).
 *
 * @param element - Élément à afficher ; avec la Popover API, il doit porter `popover="manual"`.
 */
export function showLayer(element: HTMLElement): void {
  if (supportsPopover) {
    if (!element.matches(':popover-open')) element.showPopover();
  } else element.setAttribute('data-open', '');
}

/**
 * Masque une couche flottante.
 *
 * @param element - Élément à masquer.
 */
export function hideLayer(element: HTMLElement): void {
  if (supportsPopover) {
    if (element.matches(':popover-open')) element.hidePopover();
  } else element.removeAttribute('data-open');
}

/**
 * Indique si une couche flottante est ouverte.
 *
 * @param element - Élément testé.
 * @returns `true` si la couche est affichée.
 */
export function isLayerOpen(element: HTMLElement): boolean {
  return supportsPopover ? element.matches(':popover-open') : element.hasAttribute('data-open');
}
