// src/types/less.d.ts

/**
 * Déclaration générique pour les imports de fichiers LESS.
 * Indique à TypeScript que tout import '*.less' renvoie une chaîne de caractères (le CSS compilé).
 */
declare module '*.less' {
  const styles: string;
  export default styles;
}

declare module '*.css' {
  const styles: string;
  export default styles;
}
