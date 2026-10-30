import { addConnectHook, BaseElement } from '../../../components/base/BaseElement';
import { Scheduler } from '../utils/Scheduler';
import type { AcceptedAny, AcceptedFunction } from '../utils/types';

const schedulersKey = Symbol('schedulers');

type Entry = { scheduler: Scheduler<AcceptedAny>; callback: AcceptedFunction };

type SchedulerHolder = { [schedulersKey]?: Map<symbol, Entry> };

/**
 * Décorateur permettant de planifier l'exécution d'une méthode via un {@link Scheduler}.
 *
 * La méthode originale n'est appelée qu'une seule fois par instance, au premier appel, et doit
 * retourner le callback du `Scheduler`. Chaque appel (le premier compris) planifie ensuite
 * ce callback à la prochaine frame d'animation avec le premier argument de l'appel ;
 * les appels groupés ne s'exécutent qu'une fois, avec la dernière valeur.
 * L'appel retourne le callback du `Scheduler`.
 * Sur un {@link BaseElement}, l'exécution en attente est annulée à la déconnexion.
 *
 * @example
 * ```typescript
 * class Composant extends BaseElement {
 *   @Schedule()
 *   protected onUpdate(_initValue: number) {
 *     return (val: number | null) => {
 *       console.log('Valeur traitée :', val);
 *     };
 *   }
 *
 *   trigger() {
 *     this.onUpdate(1);
 *     this.onUpdate(2); // seule la valeur 2 est traitée
 *   }
 * }
 * ```
 */
export function Schedule() {
  return function <This, Args extends AcceptedAny[], Callback extends AcceptedFunction>(
    target: (this: This, ...args: Args) => Callback,
    context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Callback>,
  ) {
    const sKey = Symbol(String(context.name));

    context.addInitializer(function (this: unknown) {
      if (!(this instanceof BaseElement)) return;
      const holder = this as SchedulerHolder;
      addConnectHook(this, (scope) =>
        scope.own(() => holder[schedulersKey]?.get(sKey)?.scheduler.cancel()),
      );
    });

    return function (this: This & SchedulerHolder, ...args: Args): Callback {
      const caches = (this[schedulersKey] ??= new Map());
      let entry = caches.get(sKey);

      if (!entry) {
        const callback: unknown = target.apply(this, args);
        if (typeof callback !== 'function') {
          throw new Error(
            `@Schedule : la méthode "${String(context.name)}" doit retourner un callback.`,
          );
        }
        entry = { scheduler: new Scheduler<AcceptedAny>(callback.bind(this)), callback };
        caches.set(sKey, entry);
      }

      entry.scheduler.schedule(args[0]);
      return entry.callback as Callback;
    };
  };
}
