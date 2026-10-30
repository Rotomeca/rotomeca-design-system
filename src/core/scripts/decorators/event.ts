import { Risky, Success, type Result } from '@rotomeca/rop';
import type { Optional } from '@rotomeca/utils';
import type { AcceptedAny, AcceptedFunction } from '../utils/types';

type Emitter = {
  emit?: (type: string, detail: unknown, options?: CustomEventInit) => boolean;
} & EventTarget;

/**
 * @Fire : Déclenche un événement personnalisé après l'appel de la méthode.
 * Utilise `emit()` de BaseElement s'il existe, sinon `dispatchEvent`.
 * Le `detail` est la valeur de retour de la méthode, ou son premier argument.
 */
export function Fire(
  eventName: string,
  options: CustomEventInit = { bubbles: true, composed: true },
) {
  return function (originalMethod: AcceptedFunction, context: ClassMethodDecoratorContext) {
    if (context.kind !== 'method') {
      throw new Error('@Fire ne peut être utilisé que sur des méthodes.');
    }

    return function (this: Emitter, ...args: AcceptedAny[]) {
      const result = originalMethod.apply(this, args);
      const detail = result ?? args[0];

      if (typeof this.emit === 'function') this.emit(eventName, detail, options);
      else this.dispatchEvent(new CustomEvent(eventName, { ...options, detail }));

      return result;
    };
  };
}

/**
 * Constructeur d'événement. Gère deux cas :
 * 1. La classe connaît son nom (new EventClass(options))
 * 2. Le nom est passé au décorateur (new EventClass(name, options))
 */
type EventConstructor<T extends CustomEvent> = new (...args: AcceptedAny[]) => T;

/**
 * @CustomFire : Déclenche un événement d'une classe spécifique lors de l'appel de la méthode.
 *
 * @param EventClass La classe de l'événement à instancier (doit étendre CustomEvent).
 * @param eventName Optionnel : Force un nom d'événement spécifique.
 * @param options Options d'initialisation (bubbles, composed, etc.).
 */
export function CustomFire<T extends CustomEvent>(
  EventClass: EventConstructor<T>,
  eventName?: string,
  options: CustomEventInit = { bubbles: true, composed: true },
) {
  return function (originalMethod: AcceptedFunction, context: ClassMethodDecoratorContext) {
    if (context.kind !== 'method') {
      throw new Error('@CustomFire ne peut être utilisé que sur des méthodes.');
    }

    return function (this: EventTarget, ...args: AcceptedAny[]) {
      const result = originalMethod.apply(this, args);
      const detail = result ?? args[0];

      // Repli construit seulement si la construction normale échoue.
      const created = _____StCustomFire
        .tryInitEvent(EventClass, eventName, { ...options, detail })
        .unwrapOr(null as unknown as T) as T | null;
      const event = created ?? new EventClass(result);

      this.dispatchEvent(event);

      return result;
    };
  };
}

abstract class _____StCustomFire {
  @Risky()
  static tryInitEvent<T extends CustomEvent>(
    EventClass: EventConstructor<T>,
    eventName: Optional<string>,
    eventInit: CustomEventInit,
  ): Result<T> {
    const event = eventName ? new EventClass(eventName, eventInit) : new EventClass(eventInit);
    return Success.Create(event);
  }
}
