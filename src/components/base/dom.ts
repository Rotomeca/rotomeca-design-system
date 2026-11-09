/** Valeur acceptée pour un attribut ; `null` et `undefined` l'omettent. */
export type AttributeValue = string | number | null | undefined;

/** Options de création d'un élément via {@link createElement}. */
export interface ElementOptions {
  /** Classes à ajouter ; les noms séparés par des espaces sont acceptés. */
  classes?: readonly string[];
  /** Attributs textuels ; les valeurs `null`/`undefined` sont ignorées. */
  attributes?: Readonly<Record<string, AttributeValue>>;
  /** Attributs booléens HTML : présents si `true`, absents si `false`. */
  booleanAttributes?: Readonly<Record<string, boolean>>;
  /** Attributs `data-*`, indexés par nom de la propriété `dataset`. */
  dataset?: Readonly<Record<string, string>>;
  /** Enfants ajoutés à l'élément ; les chaînes sont insérées comme du texte. */
  children?: readonly (Node | string)[];
}

/**
 * Crée un élément HTML typé à partir d'options déclaratives.
 *
 * @remarks
 * Les chaînes sont TOUJOURS du texte. Les booléens HTML ont une API distincte.
 *
 * @typeParam K - Nom de la balise HTML.
 * @param tag - Nom de la balise.
 * @param options - Classes, attributs, dataset et enfants.
 * @param document - Document propriétaire du nouvel élément.
 * @returns L'élément créé.
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
  document: Document = globalThis.document,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.classList.add(...(options.classes ?? []).flatMap((s) => s.split(/\s+/)).filter(Boolean));
  for (const [name, value] of Object.entries(options.attributes ?? {})) {
    if (value != null) element.setAttribute(name, String(value));
  }
  for (const [name, value] of Object.entries(options.booleanAttributes ?? {})) {
    element.toggleAttribute(name, value);
  }
  for (const [name, value] of Object.entries(options.dataset ?? {})) element.dataset[name] = value;
  element.append(...(options.children ?? []));
  return element;
}

/**
 * Crée un `<template>` à partir d'une chaîne HTML.
 *
 * @remarks
 * HTML de confiance uniquement : ce helper n'est PAS un assainisseur HTML.
 *
 * @param html - Code HTML de confiance.
 * @param document - Document propriétaire du gabarit.
 * @returns Le gabarit créé.
 */
export function trustedTemplate(
  html: string,
  document: Document = globalThis.document,
): HTMLTemplateElement {
  const template = document.createElement('template');
  template.innerHTML = html;
  return template;
}

/**
 * Exécute `fn` une fois les enfants de `element` analysés.
 *
 * @remarks
 * Un composant light DOM connecté pendant le parsing du HTML n'a pas encore ses enfants :
 * le travail est différé à `DOMContentLoaded` tant que le document charge et que l'élément est le dernier nœud.
 *
 * @param element - Élément connecté.
 * @param fn - Travail à exécuter sur les enfants.
 */
export function whenParsed(element: Element, fn: () => void): void {
  if (document.readyState === 'loading' && !element.nextSibling) {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else fn();
}

/**
 * Indique si un slot reçoit du contenu (élément ou texte non vide).
 *
 * @param slot - Slot testé ; `null` renvoie `false`.
 * @returns `true` si au moins un nœud significatif est assigné.
 */
export function hasContent(slot: HTMLSlotElement | null | undefined): boolean {
  return (
    !!slot &&
    slot
      .assignedNodes({ flatten: true })
      .some((n) => n.nodeType === Node.ELEMENT_NODE || !!n.textContent?.trim())
  );
}
