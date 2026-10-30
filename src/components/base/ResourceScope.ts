/**
 * Fonction de nettoyage d'une ressource liée à une connexion.
 *
 * @remarks
 * Nettoyage idempotent, exécuté en ordre inverse de l'enregistrement.
 */
export type Cleanup = () => void;

/** Ressource libérable : une fonction de nettoyage ou un objet exposant `dispose()`. */
export type Disposable = Cleanup | { dispose(): void };

/**
 * Regroupe les ressources d'une connexion (écouteurs, minuteurs, frames) pour les libérer ensemble.
 */
export class ResourceScope {
  /** Contrôleur dont le signal est annulé à la libération. */
  readonly #controller = new AbortController();
  /** Nettoyages en attente, dans l'ordre d'enregistrement. */
  readonly #cleanups = new Set<Cleanup>();

  /**
   * @param report - Reçoit les erreurs levées pendant un nettoyage (`console.error` par défaut).
   */
  constructor(private readonly report: (error: unknown) => void = console.error) {}

  /** Signal annulé à la libération de la portée. */
  get signal(): AbortSignal {
    return this.#controller.signal;
  }

  /** `true` une fois la portée libérée. */
  get disposed(): boolean {
    return this.signal.aborted;
  }

  /**
   * Prend possession d'une ressource, libérée avec la portée.
   * Si la portée est déjà libérée, la ressource est libérée immédiatement.
   *
   * @param resource - Fonction de nettoyage ou objet `dispose()`.
   * @returns Une fonction permettant un nettoyage anticipé.
   */
  own(resource: Disposable): Cleanup {
    let active = true;
    const cleanup = () => {
      if (!active) return;
      active = false;
      this.#cleanups.delete(cleanup);
      try {
        typeof resource === 'function' ? resource() : resource.dispose();
      } catch (error) {
        try {
          this.report(error);
        } catch (reportError) {
          console.error(error, reportError);
        }
      }
    };
    if (this.disposed) cleanup();
    else this.#cleanups.add(cleanup);
    return cleanup;
  }

  /**
   * Ajoute un écouteur d'événement retiré à la libération de la portée.
   *
   * @typeParam K - Nom d'un événement global connu.
   * @param target - Cible de l'écouteur.
   * @param type - Type d'événement.
   * @param listener - Fonction appelée à chaque événement.
   * @param options - Options de `addEventListener`.
   * @returns Une fonction retirant l'écouteur par anticipation.
   */
  listen<K extends keyof GlobalEventHandlersEventMap>(
    target: EventTarget,
    type: K,
    listener: (event: GlobalEventHandlersEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): Cleanup;
  /**
   * Ajoute un écouteur d'événement retiré à la libération de la portée.
   *
   * @param target - Cible de l'écouteur.
   * @param type - Type d'événement.
   * @param listener - Fonction appelée à chaque événement.
   * @param options - Options de `addEventListener`.
   * @returns Une fonction retirant l'écouteur par anticipation.
   */
  listen(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions,
  ): Cleanup;
  listen(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions,
  ): Cleanup {
    if (this.disposed) return () => {};
    target.addEventListener(type, listener, options);
    const capture = typeof options === 'boolean' ? options : options?.capture;
    return this.own(() => target.removeEventListener(type, listener, capture));
  }

  /**
   * Planifie un `setTimeout` annulé à la libération de la portée.
   *
   * @param callback - Fonction appelée à l'échéance, sauf si la portée est libérée.
   * @param delay - Délai en millisecondes.
   * @returns Une fonction annulant le minuteur.
   */
  timeout(callback: () => void, delay: number): Cleanup {
    if (this.disposed) return () => {};
    const id = setTimeout(() => {
      cancel();
      if (!this.disposed) callback();
    }, delay);
    const cancel = this.own(() => clearTimeout(id));
    return cancel;
  }

  /**
   * Planifie un `setInterval` annulé à la libération de la portée.
   *
   * @param callback - Fonction appelée à chaque intervalle, sauf si la portée est libérée.
   * @param delay - Intervalle en millisecondes.
   * @returns Une fonction arrêtant l'intervalle.
   */
  interval(callback: () => void, delay: number): Cleanup {
    if (this.disposed) return () => {};
    const id = setInterval(() => {
      if (!this.disposed) callback();
    }, delay);
    return this.own(() => clearInterval(id));
  }

  /**
   * Demande une `requestAnimationFrame` annulée à la libération de la portée.
   *
   * @param callback - Fonction appelée à la prochaine frame, sauf si la portée est libérée.
   * @param view - Fenêtre dont on utilise `requestAnimationFrame`.
   * @returns Une fonction annulant la demande.
   */
  frame(callback: FrameRequestCallback, view: Window = window): Cleanup {
    if (this.disposed) return () => {};
    const id = view.requestAnimationFrame((time) => {
      cancel();
      if (!this.disposed) callback(time);
    });
    const cancel = this.own(() => view.cancelAnimationFrame(id));
    return cancel;
  }

  /**
   * Libère la portée : annule le signal puis exécute les nettoyages en ordre inverse.
   * Sans effet si la portée est déjà libérée.
   */
  dispose(): void {
    if (this.disposed) return;
    this.#controller.abort();
    for (const cleanup of [...this.#cleanups].reverse()) cleanup();
  }
}
