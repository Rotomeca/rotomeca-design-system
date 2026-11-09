/**
 * Configuration du site de documentation.
 *
 * Chaque page de composant correspond à `docs/examples/<slug>.html` (exemples) ; l'API (attributs,
 * slots, parts, événements) est extraite du TSDoc des sources. Tous les tags de
 * `src/core/scripts/utils/tags.ts` doivent apparaître dans une page (vérifié au build).
 */

export const site = {
  title: 'Rotomeca Design System',
  description:
    'Design system de Web Components (Shadow DOM) en TypeScript + LESS, palette automnale, thèmes clair et sombre.',
  repository: 'https://github.com/Rotomeca/rotomeca-design-system',
  npm: '@rotomeca/design-system',
};

/** Niveaux Atomic Design, dans l'ordre d'affichage. */
export const levels = [
  {
    id: 'atoms',
    title: 'Atomes',
    lead: 'Éléments indivisibles, sans dépendance vers un autre composant.',
  },
  { id: 'molecules', title: 'Molécules', lead: 'Compositions d’atomes à responsabilité unique.' },
  {
    id: 'organisms',
    title: 'Organismes',
    lead: 'Sections autonomes : navigation, dialogues, tableaux.',
  },
];

/** Pages « guide » (HTML dans `docs/guide/<slug>.html`). */
export const guides = [
  { slug: 'demarrage', title: 'Démarrage', icon: 'rocket' },
  { slug: 'tokens', title: 'Tokens & thème', icon: 'palette' },
];

const inputTags = [
  'input',
  'input-text',
  'input-number',
  'input-date',
  'input-time',
  'input-datetime',
  'input-password',
  'input-search',
  'input-email',
  'input-tel',
  'input-url',
  'input-color',
  'input-range',
];

/** Pages de composants : `tags` sans le préfixe `rds-`. */
export const pages = [
  // Atomes
  { level: 'atoms', slug: 'button', title: 'Bouton', tags: ['button'] },
  {
    level: 'atoms',
    slug: 'variant-buttons',
    title: 'Boutons à variante figée',
    tags: ['primary-button', 'secondary-button', 'tertiary-button', 'danger-button'],
  },
  { level: 'atoms', slug: 'icon-button', title: 'Bouton icône', tags: ['icon-button'] },
  { level: 'atoms', slug: 'icon', title: 'Icône', tags: ['icon'] },
  { level: 'atoms', slug: 'link', title: 'Lien', tags: ['link'] },
  { level: 'atoms', slug: 'tag', title: 'Tag', tags: ['tag'] },
  { level: 'atoms', slug: 'badge', title: 'Badge', tags: ['badge'] },
  { level: 'atoms', slug: 'divider', title: 'Séparateur', tags: ['divider'] },
  { level: 'atoms', slug: 'spinner', title: 'Spinner', tags: ['spinner'] },
  { level: 'atoms', slug: 'progress', title: 'Progression', tags: ['progress'] },
  { level: 'atoms', slug: 'placeholder', title: 'Squelette', tags: ['placeholder'] },
  { level: 'atoms', slug: 'avatar', title: 'Avatar', tags: ['avatar'] },
  { level: 'atoms', slug: 'picture', title: 'Image', tags: ['picture'] },
  { level: 'atoms', slug: 'date', title: 'Date', tags: ['date'] },
  { level: 'atoms', slug: 'flexbox', title: 'Flexbox', tags: ['flexbox'] },
  { level: 'atoms', slug: 'fragment', title: 'Fragment', tags: ['fragment'] },
  { level: 'atoms', slug: 'message', title: 'Message', tags: ['message'] },
  { level: 'atoms', slug: 'input', title: 'Champs de saisie', tags: inputTags },
  { level: 'atoms', slug: 'textarea', title: 'Zone de texte', tags: ['textarea'] },
  { level: 'atoms', slug: 'select', title: 'Liste déroulante', tags: ['select'] },
  { level: 'atoms', slug: 'checkbox', title: 'Case à cocher', tags: ['checkbox'] },
  { level: 'atoms', slug: 'radio', title: 'Bouton radio', tags: ['radio'] },
  { level: 'atoms', slug: 'switch', title: 'Interrupteur', tags: ['switch'] },
  {
    level: 'atoms',
    slug: 'segmented-control',
    title: 'Contrôle segmenté',
    tags: ['segmented-control'],
  },
  { level: 'atoms', slug: 'input-file', title: 'Ajout de fichiers', tags: ['input-file'] },
  { level: 'atoms', slug: 'tooltip', title: 'Infobulle', tags: ['tooltip'] },
  { level: 'atoms', slug: 'helper', title: 'Aide contextuelle', tags: ['helper'] },
  // Molécules
  { level: 'molecules', slug: 'alert', title: 'Alerte', tags: ['alert'] },
  { level: 'molecules', slug: 'callout', title: 'Mise en avant', tags: ['callout'] },
  { level: 'molecules', slug: 'quote', title: 'Citation', tags: ['quote'] },
  { level: 'molecules', slug: 'card', title: 'Carte', tags: ['card'] },
  { level: 'molecules', slug: 'breadcrumb', title: 'Fil d’Ariane', tags: ['breadcrumb'] },
  { level: 'molecules', slug: 'pagination', title: 'Pagination', tags: ['pagination'] },
  { level: 'molecules', slug: 'tabs', title: 'Onglets', tags: ['tabs', 'tab-panel'] },
  {
    level: 'molecules',
    slug: 'accordion',
    title: 'Accordéon',
    tags: ['accordion', 'accordion-item'],
  },
  { level: 'molecules', slug: 'toast', title: 'Notification', tags: ['toast'] },
  { level: 'molecules', slug: 'fieldset', title: 'Groupe de champs', tags: ['fieldset'] },
  { level: 'molecules', slug: 'button-group', title: 'Groupe de boutons', tags: ['button-group'] },
  { level: 'molecules', slug: 'menu', title: 'Menu', tags: ['menu', 'menu-item'] },
  { level: 'molecules', slug: 'stepper', title: 'Indicateur d’étapes', tags: ['stepper'] },
  { level: 'molecules', slug: 'skip-links', title: 'Liens d’évitement', tags: ['skip-links'] },
  { level: 'molecules', slug: 'back-to-top', title: 'Retour en haut', tags: ['back-to-top'] },
  // Organismes
  { level: 'organisms', slug: 'dialog', title: 'Modale', tags: ['dialog'] },
  { level: 'organisms', slug: 'drawer', title: 'Tiroir', tags: ['drawer'] },
  { level: 'organisms', slug: 'header', title: 'En-tête', tags: ['header'] },
  { level: 'organisms', slug: 'footer', title: 'Pied de page', tags: ['footer'] },
  { level: 'organisms', slug: 'sidenav', title: 'Navigation latérale', tags: ['sidenav'] },
  { level: 'organisms', slug: 'table', title: 'Tableau', tags: ['table'] },
  {
    level: 'organisms',
    slug: 'theme-switcher',
    title: 'Paramètres d’affichage',
    tags: ['theme-switcher'],
  },
];
