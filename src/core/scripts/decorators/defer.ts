import type { AcceptedAny, AcceptedFunction } from '../utils/types';

/**
 * Factory de décorateurs pour différer l'exécution d'une méthode.
 * @internal
 */
function createAsyncDecorator(scheduler: (callback: () => void) => void, name: string) {
  return function (target: AcceptedFunction, context: ClassMethodDecoratorContext) {
    const methodName = String(context.name);

    return function (this: unknown, ...args: AcceptedAny[]): void {
      scheduler(() => {
        try {
          target.apply(this, args);
        } catch (error) {
          console.error(`[${name}] Error executing deferred method '${methodName}'`, error);
        }
      });
    };
  };
}

/**
 * Diffère l'exécution de la méthode à la fin de la boucle d'événements courante (Macrotask).
 * Utilise `setTimeout(..., delay)`.
 *
 * Idéal pour attendre que le parser HTML ait fini de construire le DOM (ex: Web Components).
 *
 * @param delay Délai en millisecondes (défaut: 0).
 */
export function Defer(delay: number = 0) {
  return createAsyncDecorator((fn) => setTimeout(fn, delay), 'Defer');
}

/**
 * Diffère l'exécution de la méthode à la fin de la stack courante, mais AVANT le prochain rendu (Microtask).
 * Utilise `queueMicrotask(...)`.
 */
export function Microtask() {
  return createAsyncDecorator((fn) => queueMicrotask(fn), 'Microtask');
}

/**
 * Diffère l'exécution de la méthode juste avant le prochain rafraîchissement de l'écran (Paint).
 * Utilise `requestAnimationFrame(...)`.
 *
 * Idéal pour les manipulations DOM visuelles ou les animations.
 */
export function RenderFrame() {
  return createAsyncDecorator((fn) => requestAnimationFrame(fn), 'RenderFrame');
}
