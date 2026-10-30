import type { Cleanup } from '../../../components/base/ResourceScope';

/**
 * Délègue un événement à un sélecteur via `composedPath`.
 *
 * @param target - Cible de l'écouteur.
 * @param type - Type d'événement écouté.
 * @param selector - Sélecteur CSS de l'élément ciblé.
 * @param callback - Appelé avec l'événement et l'élément correspondant.
 * @returns Une fonction de nettoyage retirant l'écouteur.
 */
export function delegate(
  target: EventTarget,
  type: string,
  selector: string,
  callback: (event: Event, matched: Element) => void,
): Cleanup {
  const listener = (event: Event) => {
    for (const item of event.composedPath()) {
      if (item === target) break;
      if ((item as Element).nodeType === 1 && (item as Element).matches(selector)) {
        callback(event, item as Element);
        return;
      }
    }
  };
  target.addEventListener(type, listener);
  return () => target.removeEventListener(type, listener);
}
