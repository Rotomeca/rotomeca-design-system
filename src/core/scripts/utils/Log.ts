/**
 * Journalisation minimale, préfixée par une étiquette.
 */
export abstract class Log {
  /**
   * Journalise un avertissement.
   *
   * @param tag - Étiquette de la source (ex. `@Listen`).
   * @param message - Message.
   * @param data - Données complémentaires.
   */
  static warn(tag: string, message: string, ...data: unknown[]): void {
    console.warn(`[${tag}] ${message}`, ...data);
  }

  /**
   * Journalise une erreur.
   *
   * @param tag - Étiquette de la source (ex. `@Listener`).
   * @param message - Message.
   * @param data - Données complémentaires.
   */
  static error(tag: string, message: string, ...data: unknown[]): void {
    console.error(`[${tag}] ${message}`, ...data);
  }
}
