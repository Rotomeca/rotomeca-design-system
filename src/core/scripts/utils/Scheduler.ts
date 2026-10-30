import type { Disposable } from './types';

/**
 * Regroupe les demandes successives en une seule exécution par frame d'animation.
 *
 * @remarks
 * Seule la dernière valeur planifiée avant la frame est transmise au callback.
 *
 * @typeParam T - Type de la valeur planifiée.
 */
export class Scheduler<T = unknown> implements Disposable {
  /** Identifiant de la frame en attente, ou `null`. */
  #frame: number | null = null;
  /** Dernière valeur planifiée. */
  #value: T | null = null;
  /** `true` une fois libéré. */
  #disposed = false;

  /**
   * @param callback - Appelé à la frame suivante avec la dernière valeur planifiée.
   */
  constructor(private readonly callback: (value: T | null) => void) {}

  /**
   * Planifie l'exécution du callback à la prochaine frame.
   *
   * @param value - Valeur transmise au callback.
   */
  schedule(value?: T): void {
    if (this.#disposed) return;
    this.#value = value ?? null;
    if (this.#frame !== null) return;
    this.#frame = requestAnimationFrame(() => {
      this.#frame = null;
      const current = this.#value;
      this.#value = null;
      this.callback(current);
    });
  }

  /** Annule l'exécution en attente ; le planificateur reste utilisable. */
  cancel(): void {
    if (this.#frame !== null) cancelAnimationFrame(this.#frame);
    this.#frame = null;
    this.#value = null;
  }

  /** Annule l'exécution en attente et désactive définitivement le planificateur. */
  dispose(): void {
    this.#disposed = true;
    this.cancel();
  }
}
