import { CircularEventDelegate, EventDelegate } from '@rotomeca/event';
import type { Func, Nullable } from '@rotomeca/utils';
import { Log } from '../utils/Log';

/**
 * Clé Symbol utilisée pour stocker la Map de cache des listeners sur l'instance cible.
 * @internal
 */
const listenersCacheKey = Symbol('listenersCache');

/** Événement géré par {@link Listener}. */
type ManagedEvent<TCallback extends Func> = EventDelegate<TCallback>;

/**
 * Options internes passées à la fonction helper `_get`.
 * @typeParam T Type de l'instance cible.
 * @typeParam TCallback Type de la fonction de callback de l'événement.
 */
type GetListenerOptions<T, TCallback extends Func> = {
  /** L'instance de la classe contenant l'accesseur décoré. */
  target: T;
  /** La clé unique identifiant la propriété de l'événement dans le cache. */
  listenerCacheKey: symbol;
  /** Fonction d'initialisation optionnelle exécutée à la création de l'événement. */
  initializator?: Nullable<CallbackInitializator<TCallback, T>>;
  /** Si true, instancie un `CircularEventDelegate`. */
  circular?: boolean;
};

/**
 * Signature de la fonction d'initialisation d'un événement.
 * Permet de configurer l'événement (ex: ajouter des abonnés par défaut) lors de sa création.
 *
 * @typeParam TCallback Signature de la fonction callback de l'événement.
 * @typeParam This Type de l'instance de la classe parente.
 * @param event L'instance de l'événement nouvellement créée.
 * @param instance L'instance de la classe parente.
 */
export type CallbackInitializator<TCallback extends Func, This> = (
  event: ManagedEvent<TCallback>,
  instance: This,
) => void;

/**
 * Options de configuration pour le décorateur {@link Listener}.
 */
export type ListenerDefaultOptions = {
  /**
   * Si `true` (par défaut), l'événement n'est instancié que lors du premier accès (getter).
   * Si `false`, il est instancié lors de l'initialisation de l'instance.
   * @default true
   */
  lazy?: boolean;
  /**
   * Si `true`, crée un {@link CircularEventDelegate} au lieu d'un {@link EventDelegate}.
   * @default false
   */
  circular?: boolean;
};

/**
 * Décorateur d'accesseur automatique pour gérer des instances d'événements (`@rotomeca/event`).
 *
 * Le décorateur transforme un accesseur en propriété gérée, avec une instanciation unique
 * par instance, et interdit l'écrasement de l'événement via le setter.
 *
 * @param initializator - (Optionnel) Fonction exécutée une seule fois à la création de l'événement.
 * @param options - (Optionnel) Configuration (lazy loading, type d'événement).
 * @throws {Error} Si une assignation est tentée sur la propriété décorée.
 *
 * @example
 * ```ts
 * class MyComponent {
 *   @Listener((evt, instance) => evt.add('main', instance.handleAction), { lazy: true })
 *   accessor onAction!: EventDelegate<(val: string) => void>;
 * }
 * ```
 */
export function Listener<TCallback extends Func, This = unknown>(
  initializator?: Nullable<CallbackInitializator<TCallback, This>>,
  options?: ListenerDefaultOptions,
) {
  const { circular = false, lazy = true } = options ?? {};

  return function (
    _target: ClassAccessorDecoratorTarget<This, ManagedEvent<TCallback>>,
    context: ClassAccessorDecoratorContext<This, ManagedEvent<TCallback>>,
  ): ClassAccessorDecoratorResult<This, ManagedEvent<TCallback>> {
    const listenerCacheKey = Symbol(`listener_${String(context.name)}`);
    const args = { listenerCacheKey, circular, initializator };

    if (!lazy) {
      context.addInitializer(function (this: This) {
        _get<This, TCallback>({ target: this, ...args });
      });
    }

    return {
      get(this: This): ManagedEvent<TCallback> {
        return _get<This, TCallback>({ target: this, ...args });
      },
      set(_value) {
        throw new Error(
          `Cannot set decorated accessor ${String(context.name)}. It is managed by the @Listener decorator.`,
        );
      },
    };
  };
}

/**
 * Récupère ou crée l'instance de l'événement (chargement immédiat ou différé).
 *
 * @throws {Error} Si l'initializator a échoué.
 * @internal
 */
function _get<T, TCallback extends Func>(
  options: GetListenerOptions<T, TCallback>,
): ManagedEvent<TCallback> {
  const { target: self, listenerCacheKey, circular, initializator } = options;

  const holder = self as { [listenersCacheKey]?: Map<symbol, ManagedEvent<TCallback>> };
  const cache = (holder[listenersCacheKey] ??= new Map());
  let event = cache.get(listenerCacheKey);

  if (!event) {
    event = (circular
      ? new CircularEventDelegate()
      : new EventDelegate<TCallback>()) as unknown as ManagedEvent<TCallback>;

    if (initializator && initializator.name !== NoInitListener.name) {
      try {
        initializator(event, self);
      } catch (error) {
        Log.error(
          '@Listener',
          `Failed to initialize event for ${String(listenerCacheKey)}`,
          error,
          options,
        );

        throw error;
      }
    }

    cache.set(listenerCacheKey, event);
  }

  return event;
}

/**
 * Fonction "No-op" servant de placeholder sémantique comme premier argument de {@link Listener},
 * quand aucune logique d'initialisation n'est nécessaire mais qu'il faut passer des options.
 *
 * @example
 * ```ts
 * class GraphNode {
 *   @Listener(NoInitListener, { circular: true })
 *   accessor links!: CircularEventDelegate;
 * }
 * ```
 */
export function NoInitListener() {}
