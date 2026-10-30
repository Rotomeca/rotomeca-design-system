/**
 * Callback appelé lors du changement d'une valeur.
 *
 * @typeParam TNew - Type de la nouvelle valeur.
 * @typeParam TOld - Type de l'ancienne valeur.
 * @typeParam TCaller - Type de l'émetteur du changement.
 */
export type CallbackChanged<TNew, TOld, TCaller> = (
  newValue: TNew,
  oldValue: TOld,
  sender: TCaller,
) => void;

/**
 * Callback appelé avec uniquement l'émetteur.
 *
 * @typeParam TCaller - Type de l'émetteur.
 */
export type CallbackChangedSimple<TCaller> = (sender: TCaller) => void;

/**
 * Objet simple indexé par des chaînes.
 *
 * @typeParam T - Type des valeurs.
 */
export type PlainObject<T = unknown> = {
  [key: string]: T;
};

/**
 * Utilitaire générique pour extraire les valeurs d'un type objet.
 * Évite la répétition de `(typeof T)[keyof typeof T]`.
 *
 * @typeParam T - Type objet source.
 */
export type ValueOf<T> = T[keyof T];

/** Callback d'un clic souris. */
export type ClickCallback = (e: MouseEvent) => void;

/**
 * Détail standard d'un événement émis par un composant.
 *
 * @typeParam T - Type de l'émetteur.
 * @typeParam TEvent - Type de l'événement natif d'origine.
 */
export type BasicDetail<T, TEvent extends Event> = {
  /** Événement natif d'origine. */
  inner: TEvent;
  /** Composant émetteur. */
  caller: T;
};

/** Valeur primitive simple : chaîne, nombre ou booléen. */
export type BasicValue = string | number | boolean;

/** `any` explicitement toléré, là où le typage précis n'est pas possible. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AcceptedAny = any;

/** `Function` explicitement toléré, là où la signature n'est pas connue. */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type AcceptedFunction = Function;

/**
 * Type utilitaire pour extraire uniquement les propriétés CSS modifiables.
 * On exclut les fonctions et les index numériques.
 */
export type CSSPropertyName = {
  [K in keyof CSSStyleDeclaration]: CSSStyleDeclaration[K] extends AcceptedFunction ? never : K;
}[keyof Omit<CSSStyleDeclaration, 'length' | 'parentRule'>] &
  string;

/** Ensemble partiel de propriétés CSS ; `null` supprime la propriété. */
export type CSSPropertiesName = Partial<Record<CSSPropertyName, string | null>>;

/** Valeur d'une déclaration CSS. */
export type CSSStyleDeclarationValue = string;

/** Objet dont les ressources peuvent être libérées via `dispose()`. */
export interface Disposable {
  /** Libère les ressources de l'objet. */
  dispose(): void;
}
