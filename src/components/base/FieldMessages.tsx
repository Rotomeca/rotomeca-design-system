export { FieldMessages };

/**
 * Fragment JSX des messages d'un champ : indice (slot `hint`) et message d'état (slots `success` / `error`).
 *
 * @remarks
 * Partagé par `rds-input`, `rds-select` et `rds-textarea` ; piloté par {@link BaseFieldElement}.
 * Les composants qui l'utilisent importent `RotomecaMessage` pour que `rds-message` soit défini.
 *
 * @returns Le HTML des messages.
 */
function FieldMessages(): string {
  return (
    <div class="messages">
      <rds-message id="hint" hidden>
        <slot name="hint" id="hint-slot"></slot>
      </rds-message>
      <rds-message id="state-msg" hidden>
        <span id="success-text" hidden>
          <slot name="success">
            <span id="success-fallback">Le champ est valide.</span>
          </slot>
        </span>
        <span id="error-text" hidden>
          <slot name="error" id="error-slot">
            <span id="error-fallback">Le champ est invalide.</span>
          </slot>
        </span>
      </rds-message>
    </div>
  );
}
