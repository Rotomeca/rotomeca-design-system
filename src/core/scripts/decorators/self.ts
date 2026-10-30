/**
 * @Self : Injecte la classe (le constructeur) dans la propriété.
 * Utilisable sur un champ simple : @Self _!: typeof MaClasse;
 */
export function Self(_value: undefined, context: ClassFieldDecoratorContext) {
  if (context.kind !== 'field') {
    throw new Error('@Self ne peut être utilisé que sur un champ (field).');
  }

  // Exécuté à la création de l'instance
  context.addInitializer(function (this: unknown) {
    Reflect.set(this as object, context.name, (this as object).constructor);
  });
}
