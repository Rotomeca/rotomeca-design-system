import { RotomecaMessage } from '../atoms/message/message';

export { FieldMessages };

/**
 * Fragment JSX des messages d'un champ : indice (slot `hint`) et message d'état (slots `success` / `error`).
 *
 * @remarks
 * Partagé par `rds-input`, `rds-select` et `rds-textarea` ; piloté par {@link BaseFieldElement}.
 * Référencer `RotomecaMessage` ici garantit (contre le tree-shaking) que `rds-message` est défini.
 *
 * @returns Le HTML des messages.
 */
function FieldMessages(): string {
  return (
    <div class="messages">
      <RotomecaMessage id="hint" hidden>
        <slot name="hint" id="hint-slot"></slot>
      </RotomecaMessage>
      <RotomecaMessage id="state-msg" hidden>
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
      </RotomecaMessage>
    </div>
  );
}
