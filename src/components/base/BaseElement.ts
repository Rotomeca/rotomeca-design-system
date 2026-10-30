import { ResourceScope, type Cleanup } from './ResourceScope.js';

/**
 * Changement d'un attribut observé, agrégé entre deux mises à jour.
 */
export interface AttributeChange {
  /** Valeur de l'attribut avant le premier changement du lot (`null` si absent). */
  readonly oldValue: string | null;
  /** Dernière valeur de l'attribut (`null` si supprimé). */
  readonly newValue: string | null;
}

/**
 * Changements d'attributs d'un lot de mise à jour, indexés par nom d'attribut.
 */
export type Changes = ReadonlyMap<string, AttributeChange>;

/**
 * Contexte transmis aux hooks {@link BaseElement.update} et {@link BaseElement.afterUpdate}.
 */
export interface UpdateContext {
  /** Attributs modifiés depuis la mise à jour précédente. */
  readonly attributes: Changes;
  /** Raisons ayant déclenché la mise à jour (ex. `connect`, `attribute`, `manual`). */
  readonly reasons: ReadonlySet<string>;
}

/** Feuilles de style construites pour un constructeur, avec les sources CSS dont elles proviennent. */
type SheetCache = { sources: readonly string[]; sheets: CSSStyleSheet[] };

/** Cache des feuilles de style, par document puis par constructeur. */
const sheetCaches = new WeakMap<Document, WeakMap<object, SheetCache>>();

/**
 * Base autonome pour Chromium/Electron moderne. Aucun rendu implicite par `innerHTML`.
 *
 * @remarks
 * Surcharger les hooks protégés, pas les callbacks natifs.
 * Les hooks `build`/`update`/`connect` sont synchrones ; utiliser {@link BaseElement.connectionSignal}
 * pour l'asynchrone.
 */
export abstract class BaseElement extends HTMLElement {
  /** Nom de la balise utilisé par défaut par {@link BaseElement.define}. */
  static tagName = '';
  /** Options du Shadow DOM, ou `null` pour travailler en Light DOM. */
  static shadowOptions: ShadowRootInit | null = { mode: 'open' };
  /** Attributs observés par `attributeChangedCallback`. */
  static observedAttributes: string[] = [];
  /** Propriétés publiques à récupérer si assignées avant `customElements.define()`. */
  static upgradeProperties: readonly string[] = [];
  /** CSS déjà compilé ; LESS doit être compilé avant d'arriver ici. Shadow DOM seulement. */
  static styles: readonly string[] = [];
  /** Gabarit cloné dans la racine lors de la première connexion. */
  static template: HTMLTemplateElement | null = null;

  /** Racine de rendu : le shadow root, ou l'élément lui-même en Light DOM. */
  readonly #root: ShadowRoot | this;
  /** `true` une fois `build` exécuté avec succès. */
  #initialized = false;
  /** `true` si l'initialisation a échoué ; l'élément ne se reconnecte plus. */
  #failed = false;
  /** Portée des ressources de la connexion courante. */
  #scope: ResourceScope | null = null;
  /** Changements d'attributs en attente de mise à jour. */
  #attributes = new Map<string, AttributeChange>();
  /** Raisons de mise à jour en attente. */
  #reasons = new Set<string>();
  /** `true` si une mise à jour est déjà planifiée en microtâche. */
  #queued = false;
  /** Compteur invalidant les mises à jour planifiées lors d'une déconnexion. */
  #epoch = 0;
  /** `true` pendant l'exécution de `update`/`afterUpdate`. */
  #updating = false;
  /** Résolution de la promesse `updateComplete` du lot en cours. */
  #resolve: ((success: boolean) => void) | null = null;
  /** Promesse du lot de mise à jour en cours. */
  #complete: Promise<boolean> = Promise.resolve(true);
  /** Stockage de données libres associées à l'instance. */
  #data = new Map<string | symbol, unknown>();
  /** Feuilles de style adoptées appartenant à cette instance. */
  #ownedSheets: CSSStyleSheet[] = [];
  /** Éléments `<style>` créés en repli quand les feuilles adoptées sont indisponibles. */
  #styleNodes: HTMLStyleElement[] = [];

  /**
   * Crée l'élément et attache le Shadow DOM selon {@link BaseElement.shadowOptions}.
   *
   * @remarks
   * Aucun hook virtuel n'est appelé ici : les champs des classes dérivées ne sont pas encore initialisés.
   */
  constructor() {
    super();
    const config = this.constructor as typeof BaseElement;
    // Aucun hook virtuel ici : les champs des classes dérivées ne sont pas initialisés.
    this.#root = config.shadowOptions === null ? this : this.attachShadow(config.shadowOptions);
  }

  /** Racine de rendu : le shadow root, ou l'élément lui-même en Light DOM. */
  get renderRoot(): ShadowRoot | this {
    return this.#root;
  }

  /** `true` une fois le DOM initial construit (`build` terminé). */
  get initialized(): boolean {
    return this.#initialized;
  }

  /**
   * Promesse du lot de mise à jour courant.
   *
   * @returns `true` : lot terminé ; `false` : interrompu par déconnexion ou erreur.
   * Ce n'est pas une garantie de paint.
   */
  get updateComplete(): Promise<boolean> {
    return this.#complete;
  }

  /**
   * Portée des ressources de la connexion courante.
   *
   * @throws {Error} Si l'élément n'est pas connecté.
   */
  protected get resources(): ResourceScope {
    if (!this.#scope || this.#scope.disposed)
      throw new Error('Ressources disponibles uniquement pendant une connexion.');
    return this.#scope;
  }

  /**
   * Signal annulé à la déconnexion, utile pour les opérations asynchrones.
   *
   * @throws {Error} Si l'élément n'est pas connecté.
   */
  protected get connectionSignal(): AbortSignal {
    return this.resources.signal;
  }

  /**
   * Callback natif de connexion : initialise l'élément au premier appel,
   * puis déclenche {@link BaseElement.onConnect} et une première mise à jour.
   */
  connectedCallback(): void {
    if (!this.isConnected || this.#scope || this.#failed) return;
    this.#scope = new ResourceScope((error) => this.#report(error, 'cleanup'));
    try {
      if (!this.#initialized) {
        const config = this.constructor as typeof BaseElement;
        for (const name of config.upgradeProperties) this.upgradeProperty(name);
        this.refreshStyles();
        if (config.template) this.#root.append(config.template.content.cloneNode(true));
        this.build(this.#root);
        this.#initialized = true;
      }
      if (this.#root !== this) {
        this.resources.listen(this.#root, 'slotchange', (event) => {
          const slot = event.target as HTMLSlotElement;
          if (slot.localName === 'slot' && slot.getRootNode() === this.#root)
            this.slotChanged(slot);
        });
      }
      this.onConnect();
      if (this.#scope) {
        this.refreshSlots();
        this.requestUpdate('connect');
      }
    } catch (error) {
      this.#failed = !this.#initialized;
      this.#stop();
      this.#report(error, 'connect');
    }
  }

  /**
   * Callback natif de déconnexion : appelle {@link BaseElement.onDisconnect}
   * puis libère toutes les ressources de la connexion.
   */
  disconnectedCallback(): void {
    if (!this.#scope) return;
    try {
      this.onDisconnect();
    } catch (error) {
      this.#report(error, 'disconnect');
    } finally {
      this.#stop();
    }
  }

  /**
   * Callback natif d'adoption par un autre document.
   * Les ressources dépendant du document sont recréées à la prochaine connexion.
   *
   * @param oldDocument - Document d'origine.
   * @param newDocument - Document d'accueil.
   */
  adoptedCallback(oldDocument: Document, newDocument: Document): void {
    try {
      if (this.#initialized) this.refreshStyles();
      this.onAdopt(oldDocument, newDocument);
    } catch (error) {
      this.#report(error, 'adopt');
    }
  }

  /**
   * Callback natif de changement d'attribut. Agrège le changement et planifie une mise à jour.
   *
   * @param name - Nom de l'attribut modifié.
   * @param oldValue - Ancienne valeur (`null` si absent).
   * @param newValue - Nouvelle valeur (`null` si supprimé).
   */
  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;
    const previous = this.#attributes.get(name);
    this.#attributes.set(name, {
      oldValue: previous ? previous.oldValue : oldValue,
      newValue,
    });
    this.requestUpdate('attribute');
    if (this.#initialized) {
      try {
        this.attributeChanged(name, oldValue, newValue);
      } catch (error) {
        this.#report(error, 'attribute');
      }
    }
  }

  /** Invalide les mises à jour planifiées, libère la portée et résout `updateComplete` à `false`. */
  #stop(): void {
    const scope = this.#scope;
    this.#scope = null;
    this.#epoch++;
    this.#queued = false;
    scope?.dispose();
    this.#resolve?.(false);
    this.#resolve = null;
  }

  /**
   * Demande une mise à jour, regroupée en microtâche avec les demandes voisines.
   *
   * @remarks
   * Les changements hors DOM restent en attente jusqu'à la prochaine connexion.
   *
   * @param reason - Raison de la mise à jour, transmise dans {@link UpdateContext.reasons}.
   * @returns La promesse du lot, équivalente à {@link BaseElement.updateComplete}.
   */
  requestUpdate(reason = 'manual'): Promise<boolean> {
    this.#reasons.add(reason);
    if (!this.#resolve)
      this.#complete = new Promise((resolve) => {
        this.#resolve = resolve;
      });
    if (this.isConnected && this.#initialized && this.#scope && !this.#queued && !this.#updating) {
      this.#queued = true;
      const epoch = this.#epoch;
      queueMicrotask(() => {
        if (epoch === this.#epoch) this.#flush();
      });
    }
    return this.#complete;
  }

  /** Exécute le lot de mise à jour en attente (`update` puis `afterUpdate`). */
  #flush(): void {
    this.#queued = false;
    if (!this.isConnected || !this.#scope) return;
    const attributes = this.#attributes;
    const reasons = this.#reasons;
    this.#attributes = new Map();
    this.#reasons = new Set();
    const resolve = this.#resolve;
    this.#resolve = null;
    const epoch = this.#epoch;
    this.#updating = true;
    let success = true;
    try {
      const context: UpdateContext = { attributes, reasons };
      this.update(context);
      if (this.isConnected && epoch === this.#epoch) this.afterUpdate(context);
    } catch (error) {
      success = false;
      this.#report(error, 'update');
    } finally {
      this.#updating = false;
      resolve?.(success && this.isConnected && epoch === this.#epoch);
      if (this.#attributes.size || this.#reasons.size) this.requestUpdate('pending');
    }
  }

  /**
   * Initialisation DOM unique. Pas de listeners de connexion ici.
   *
   * @param _root - Racine de rendu.
   */
  protected build(_root: ShadowRoot | this): void {}

  /** Appelé à chaque connexion, après l'initialisation. */
  protected onConnect(): void {}

  /** Appelé à chaque déconnexion, avant la libération des ressources. */
  protected onDisconnect(): void {}

  /**
   * Appelé quand l'élément est adopté par un autre document.
   *
   * @param _oldDocument - Document d'origine.
   * @param _newDocument - Document d'accueil.
   */
  protected onAdopt(_oldDocument: Document, _newDocument: Document): void {}

  /**
   * Met à jour le rendu à partir de l'état courant.
   *
   * @param _context - Attributs modifiés et raisons de la mise à jour.
   */
  protected update(_context: UpdateContext): void {}

  /**
   * Appelé après {@link BaseElement.update} si l'élément est toujours connecté.
   *
   * @param _context - Attributs modifiés et raisons de la mise à jour.
   */
  protected afterUpdate(_context: UpdateContext): void {}

  /**
   * Réaction synchrone optionnelle après construction (ex. valeur de formulaire).
   *
   * @remarks
   * Le rendu visuel reste dans {@link BaseElement.update}. Attention aux réflexions récursives.
   *
   * @param _name - Nom de l'attribut modifié.
   * @param _oldValue - Ancienne valeur.
   * @param _newValue - Nouvelle valeur.
   */
  protected attributeChanged(
    _name: string,
    _oldValue: string | null,
    _newValue: string | null,
  ): void {}

  /**
   * Appelé quand le contenu assigné à un slot change.
   *
   * @param _slot - Slot concerné.
   */
  protected slotChanged(_slot: HTMLSlotElement): void {}

  /**
   * Traite une erreur survenue pendant le cycle de vie. Journalise par défaut.
   *
   * @param error - Erreur interceptée.
   * @param phase - Phase concernée (`connect`, `update`, `cleanup`, etc.).
   */
  protected onError(error: unknown, phase: string): void {
    console.error(`[${this.localName}] ${phase}`, error);
  }

  /** Transmet une erreur à {@link BaseElement.onError} sans jamais lever. */
  #report(error: unknown, phase: string): void {
    try {
      this.onError(error, phase);
    } catch (reportError) {
      console.error(error, reportError);
    }
  }

  /** Relit tous les slots : utile après un ajout dynamique de slots vides. */
  refreshSlots(): void {
    if (this.#root === this) return;
    for (const slot of this.#root.querySelectorAll('slot')) this.slotChanged(slot);
  }

  /**
   * Retourne les éléments assignés à un slot de la racine.
   *
   * @param name - Nom du slot (slot par défaut si vide).
   * @param flatten - Aplatit les slots imbriqués.
   * @returns Les éléments assignés, ou un tableau vide si le slot n'existe pas.
   */
  assignedElements(name = '', flatten = true): Element[] {
    const slot = [...this.#root.querySelectorAll('slot')].find((item) => item.name === name);
    return slot?.assignedElements({ flatten }) ?? [];
  }

  /**
   * Recherche un élément dans la racine de rendu.
   *
   * @typeParam T - Type de l'élément attendu.
   * @param selector - Sélecteur CSS.
   * @returns L'élément trouvé, ou `null`.
   */
  query<T extends Element = HTMLElement>(selector: string): T | null {
    return this.#root.querySelector<T>(selector);
  }

  /**
   * Recherche tous les éléments correspondants dans la racine de rendu.
   *
   * @typeParam T - Type des éléments attendus.
   * @param selector - Sélecteur CSS.
   * @returns Les éléments trouvés.
   */
  queryAll<T extends Element = HTMLElement>(selector: string): T[] {
    return [...this.#root.querySelectorAll<T>(selector)];
  }

  /**
   * Comme {@link BaseElement.query}, mais lève une erreur si l'élément est absent.
   *
   * @typeParam T - Type de l'élément attendu.
   * @param selector - Sélecteur CSS.
   * @returns L'élément trouvé.
   * @throws {Error} Si aucun élément ne correspond au sélecteur.
   */
  require<T extends Element = HTMLElement>(selector: string): T {
    const element = this.query<T>(selector);
    if (!element) throw new Error(`[${this.localName}] Élément introuvable : ${selector}`);
    return element;
  }

  /**
   * Applique {@link BaseElement.styles} à la racine de rendu.
   *
   * @remarks
   * Partage les feuilles entre instances du même constructeur ET du même document.
   * Sans effet en Light DOM (charger explicitement une feuille globale préfixée).
   */
  refreshStyles(): void {
    if (this.#root === this) return; // En Light DOM, charger explicitement une feuille globale préfixée.
    const root = this.#root as ShadowRoot;
    const config = this.constructor as typeof BaseElement;
    const sources = config.styles;
    for (const node of this.#styleNodes) node.remove();
    this.#styleNodes = [];
    const external =
      'adoptedStyleSheets' in root
        ? root.adoptedStyleSheets.filter((sheet) => !this.#ownedSheets.includes(sheet))
        : [];
    this.#ownedSheets = [];
    const view = this.ownerDocument.defaultView;
    if (view && 'adoptedStyleSheets' in root && 'replaceSync' in view.CSSStyleSheet.prototype) {
      let cache = sheetCaches.get(this.ownerDocument);
      if (!cache) {
        cache = new WeakMap();
        sheetCaches.set(this.ownerDocument, cache);
      }
      let entry = cache.get(config);
      if (
        !entry ||
        sources.length !== entry.sources.length ||
        sources.some((s, i) => s !== entry!.sources[i])
      ) {
        const sheets = sources.map((css) => {
          const sheet = new view.CSSStyleSheet();
          sheet.replaceSync(css);
          return sheet;
        });
        entry = { sources: [...sources], sheets };
        cache.set(config, entry);
      }
      root.adoptedStyleSheets = [...external, ...entry.sheets];
      this.#ownedSheets = entry.sheets;
    } else {
      if ('adoptedStyleSheets' in root) root.adoptedStyleSheets = external;
      for (const css of sources) {
        const style = this.ownerDocument.createElement('style');
        style.textContent = css;
        root.append(style);
        this.#styleNodes.push(style);
      }
    }
  }

  /**
   * Récupère une propriété assignée avant l'upgrade de l'élément, pour qu'elle passe par l'accesseur.
   *
   * @remarks
   * Appeler avant l'usage initial d'une propriété réactive. Ne pas déclarer de champ homonyme.
   *
   * @param name - Nom de la propriété.
   * @throws {Error} Si la propriété n'est pas configurable.
   */
  protected upgradeProperty(name: string): void {
    if (!Object.hasOwn(this, name)) return;
    const value: unknown = Reflect.get(this, name);
    if (!Reflect.deleteProperty(this, name))
      throw new Error(`Propriété non configurable : ${name}`);
    Reflect.set(this, name, value);
  }

  /**
   * Lit une donnée libre associée à l'instance.
   *
   * @typeParam T - Type attendu de la donnée.
   * @param name - Clé de la donnée.
   * @returns La valeur, ou `undefined` si absente.
   */
  getData<T = unknown>(name: string | symbol): T | undefined {
    return this.#data.get(name) as T | undefined;
  }

  /**
   * Enregistre une donnée libre associée à l'instance.
   *
   * @typeParam T - Type de la donnée.
   * @param name - Clé de la donnée.
   * @param value - Valeur à stocker.
   * @returns L'instance, pour chaîner les appels.
   */
  setData<T>(name: string | symbol, value: T): this {
    this.#data.set(name, value);
    return this;
  }

  /**
   * Indique si une donnée libre existe.
   *
   * @param name - Clé de la donnée.
   */
  hasData(name: string | symbol): boolean {
    return this.#data.has(name);
  }

  /**
   * Supprime une donnée libre.
   *
   * @param name - Clé de la donnée.
   * @returns `true` si la donnée existait.
   */
  deleteData(name: string | symbol): boolean {
    return this.#data.delete(name);
  }

  /** Supprime toutes les données libres. */
  clearData(): void {
    this.#data.clear();
  }

  /**
   * Lit un attribut sous forme de chaîne.
   *
   * @param name - Nom de l'attribut.
   * @param fallback - Valeur si l'attribut est absent.
   */
  stringAttribute(name: string, fallback = ''): string {
    return this.getAttribute(name) ?? fallback;
  }

  /**
   * Lit un attribut sous forme de nombre.
   *
   * @param name - Nom de l'attribut.
   * @param fallback - Valeur si l'attribut est absent, vide ou non numérique.
   */
  numberAttribute(name: string, fallback = 0): number {
    const raw = this.getAttribute(name);
    if (raw === null || raw.trim() === '') return fallback;
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
  }

  /**
   * Lit un attribut booléen HTML.
   *
   * @param name - Nom de l'attribut.
   * @returns `true` si l'attribut est présent.
   */
  booleanAttribute(name: string): boolean {
    return this.hasAttribute(name);
  }

  /**
   * Écrit un attribut sous forme de chaîne, ou le supprime pour `null`/`undefined`.
   * N'écrit pas si la valeur est inchangée.
   *
   * @param name - Nom de l'attribut.
   * @param value - Valeur à écrire.
   * @returns L'instance, pour chaîner les appels.
   */
  setStringAttribute(name: string, value: string | number | null | undefined): this {
    if (value == null) this.removeAttribute(name);
    else if (this.getAttribute(name) !== String(value)) this.setAttribute(name, String(value));
    return this;
  }

  /**
   * Ajoute ou retire un attribut booléen HTML.
   *
   * @param name - Nom de l'attribut.
   * @param value - `true` pour l'ajouter, `false` pour le retirer.
   * @returns L'instance, pour chaîner les appels.
   */
  setBooleanAttribute(name: string, value: boolean): this {
    this.toggleAttribute(name, value);
    return this;
  }

  /**
   * Définit une propriété CSS en ligne, ou la supprime pour `null`.
   *
   * @param name - Nom de la propriété (ex. `--couleur`).
   * @param value - Valeur, ou `null` pour supprimer.
   * @param priority - Priorité de la déclaration.
   * @returns L'instance, pour chaîner les appels.
   */
  setCSSProperty(name: string, value: string | null, priority: '' | 'important' = ''): this {
    if (value === null) this.style.removeProperty(name);
    else this.style.setProperty(name, value, priority);
    return this;
  }

  /**
   * Lit une propriété CSS en ligne.
   *
   * @param name - Nom de la propriété.
   */
  getCSSProperty(name: string): string {
    return this.style.getPropertyValue(name);
  }

  /**
   * Lit la valeur calculée d'une propriété CSS.
   *
   * @param name - Nom de la propriété.
   * @returns La valeur sans espaces superflus, ou `''` si l'élément n'a pas de fenêtre.
   */
  getComputedCSSProperty(name: string): string {
    return (
      this.ownerDocument.defaultView?.getComputedStyle(this).getPropertyValue(name).trim() ?? ''
    );
  }

  /**
   * Ajoute des classes ; les noms séparés par des espaces sont acceptés.
   *
   * @param names - Noms de classes.
   * @returns L'instance, pour chaîner les appels.
   */
  addClass(...names: string[]): this {
    this.classList.add(...names.flatMap((s) => s.split(/\s+/)).filter(Boolean));
    return this;
  }

  /**
   * Retire des classes ; les noms séparés par des espaces sont acceptés.
   *
   * @param names - Noms de classes.
   * @returns L'instance, pour chaîner les appels.
   */
  removeClass(...names: string[]): this {
    this.classList.remove(...names.flatMap((s) => s.split(/\s+/)).filter(Boolean));
    return this;
  }

  /**
   * Bascule une classe.
   *
   * @param name - Nom de la classe.
   * @param force - Force l'ajout (`true`) ou le retrait (`false`).
   * @returns L'instance, pour chaîner les appels.
   */
  toggleClass(name: string, force?: boolean): this {
    this.classList.toggle(name, force);
    return this;
  }

  /**
   * Émet un événement public (`bubbles` et `composed` par défaut).
   *
   * @typeParam T - Type du `detail` de l'événement.
   * @param type - Nom de l'événement.
   * @param detail - Données transmises dans `event.detail`.
   * @param options - Options de l'événement, hors `detail`.
   * @returns `false` si un événement cancelable a été annulé.
   */
  emit<T>(type: string, detail: T, options: Omit<CustomEventInit<T>, 'detail'> = {}): boolean {
    return this.dispatchEvent(
      new CustomEvent<T>(type, {
        bubbles: true,
        composed: true,
        ...options,
        detail,
      }),
    );
  }

  /**
   * Délègue un événement à un sélecteur via `composedPath` ; un shadow root fermé reste opaque.
   *
   * @param type - Type d'événement écouté.
   * @param selector - Sélecteur CSS de l'élément ciblé.
   * @param callback - Appelé avec l'événement et l'élément correspondant.
   * @param target - Cible de l'écouteur (la racine de rendu par défaut).
   * @returns Une fonction de nettoyage retirant l'écouteur.
   */
  protected delegate(
    type: string,
    selector: string,
    callback: (event: Event, matched: Element) => void,
    target: EventTarget = this.#root,
  ): Cleanup {
    return this.resources.listen(target, type, (event) => {
      for (const item of event.composedPath()) {
        if (item === target) break;
        if ((item as Element).nodeType === 1 && (item as Element).matches(selector)) {
          callback(event, item as Element);
          return;
        }
      }
    });
  }

  /**
   * Observe les mutations du DOM ; l'observateur est déconnecté avec la connexion.
   *
   * @param target - Noeud observé.
   * @param callback - Appelé à chaque lot de mutations tant que l'élément est connecté.
   * @param options - Options du `MutationObserver`.
   * @returns L'observateur créé.
   */
  protected observeMutations(
    target: Node,
    callback: MutationCallback,
    options: MutationObserverInit,
  ): MutationObserver {
    const scope = this.resources;
    const observer = new MutationObserver((records, instance) => {
      if (!scope.disposed) callback(records, instance);
    });
    observer.observe(target, options);
    scope.own(() => observer.disconnect());
    return observer;
  }

  /**
   * Observe le redimensionnement d'un élément ; l'observateur est déconnecté avec la connexion.
   *
   * @param target - Élément observé.
   * @param callback - Appelé à chaque redimensionnement tant que l'élément est connecté.
   * @returns L'observateur créé.
   */
  protected observeResize(target: Element, callback: ResizeObserverCallback): ResizeObserver {
    const scope = this.resources;
    const observer = new ResizeObserver((entries, instance) => {
      if (!scope.disposed) callback(entries, instance);
    });
    observer.observe(target);
    scope.own(() => observer.disconnect());
    return observer;
  }

  /**
   * Observe l'intersection d'un élément ; l'observateur est déconnecté avec la connexion.
   *
   * @param target - Élément observé.
   * @param callback - Appelé à chaque changement d'intersection tant que l'élément est connecté.
   * @param options - Options de l'`IntersectionObserver`.
   * @returns L'observateur créé.
   */
  protected observeIntersection(
    target: Element,
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ): IntersectionObserver {
    const scope = this.resources;
    const observer = new IntersectionObserver((entries, instance) => {
      if (!scope.disposed) callback(entries, instance);
    }, options);
    observer.observe(target);
    scope.own(() => observer.disconnect());
    return observer;
  }

  /**
   * Surveille une media query. Le callback est appelé immédiatement, puis à chaque changement.
   *
   * @param query - Media query à surveiller.
   * @param callback - Reçoit `true` quand la media query correspond.
   * @returns Une fonction de nettoyage retirant l'écouteur.
   */
  protected watchMedia(query: string, callback: (matches: boolean) => void): Cleanup {
    const media = this.ownerDocument.defaultView!.matchMedia(query);
    const cleanup = this.resources.listen(media, 'change', () => callback(media.matches));
    callback(media.matches);
    return cleanup;
  }

  /**
   * Enregistre l'élément dans un registre de custom elements.
   *
   * @remarks
   * Définition idempotente pour le même constructeur, erreur sur une collision de nom.
   *
   * @param tag - Nom de la balise (par défaut {@link BaseElement.tagName}).
   * @param registry - Registre cible (par défaut `customElements`).
   * @throws {Error} Si aucun nom de balise n'est fourni, ou si le nom est déjà pris par une autre classe.
   */
  static define(
    this: typeof BaseElement,
    tag = this.tagName,
    registry: CustomElementRegistry = customElements,
  ): void {
    if (!tag) throw new Error('Définir static tagName ou passer un nom de balise.');
    const constructor = this as unknown as CustomElementConstructor;
    const existing = registry.get(tag);
    if (existing && existing !== constructor) throw new Error(`Balise déjà enregistrée : ${tag}`);
    if (!existing) registry.define(tag, constructor);
  }
}
