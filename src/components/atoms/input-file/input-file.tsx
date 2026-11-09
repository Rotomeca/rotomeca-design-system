import { Define } from '../../../core/scripts/decorators';
import { formatSize } from '../../../core/scripts/utils/format';
import { TAG_INPUT_FILE } from '../../../core/scripts/utils/tags';
import { BaseFormElement } from '../../base/BaseFormElement';
import { hasContent } from '../../base/dom';
import { RotomecaIcon } from '../icon/icon';
import { RotomecaIconButton } from '../icon-button/icon-button';
import { RotomecaMessage } from '../message/message';
import style from './input-file.less';

export { RotomecaInputFile };

const TEMPLATE = (
  <>
    <span class="label" part="label">
      <slot id="label-slot"></slot>
    </span>
    <label class="zone" part="zone">
      <input id="input" type="file" />
      <RotomecaIcon name="cloud-upload" />
      <span>
        <span class="cta" id="cta"></span> <span class="small" id="drop"></span>
      </span>
      <span class="small" id="constraints">
        <slot name="hint" id="hint-slot"></slot>
      </span>
    </label>
    <ul id="list" part="list"></ul>
    <div class="messages">
      <RotomecaMessage id="error" state="error" hidden />
    </div>
  </>
);

/** Octets dans un mégaoctet (la contrainte `max-size` est en Mo). */
const BYTES_PER_MB = 1048576;

/**
 * Ajout de fichiers : zone de dépôt (glisser-déposer) et bouton « Parcourir », liste des fichiers avec
 * taille et bouton « Retirer », validation du format et du poids.
 *
 * @remarks
 * Les fichiers sont soumis avec le formulaire (`FormData`). Les contraintes (formats, poids) se
 * donnent aussi en clair dans le slot `hint`.
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `accept` | `image/*,.pdf`… | Formats acceptés (vérifiés aussi au dépôt). |
 * | `max-size` | nombre (Mo) | Poids maximal par fichier. |
 * | `multiple` | booléen | Plusieurs fichiers (ajoutés à la liste). |
 * | `required`, `disabled` | booléen | Comme un contrôle natif. |
 * | `button-text`, `drop-text` | texte | Libellés de la zone. |
 *
 * Animation : la zone se teinte et se resserre, l'icône s'élève pendant le survol de dépôt ;
 * chaque fichier ajouté apparaît en glissant.
 *
 * @slot - Libellé.
 * @slot hint - Contraintes en clair (formats, poids).
 * @csspart label - Libellé.
 * @csspart zone - Zone de dépôt.
 * @csspart list - Liste des fichiers.
 *
 * @fires change - Liste de fichiers modifiée.
 * @fires {CustomEvent<{files: File[]}>} rds-input-file:change - Fichiers ajoutés.
 *
 * @cssstate dragging - Un fichier survole la zone.
 * @cssstate error - Erreur affichée.
 * @cssstate disabled - Désactivé.
 * @cssstate has-label - Un libellé est fourni.
 *
 * @example
 * ```html
 * <rds-input-file name="justificatif" accept="image/*,.pdf" max-size="5">
 *   Justificatif <span slot="hint">PNG, JPG ou PDF — 5 Mo maximum</span>
 * </rds-input-file>
 * ```
 */
@Define({ tag: TAG_INPUT_FILE, template: TEMPLATE, styles: style })
class RotomecaInputFile extends BaseFormElement {
  static observedAttributes: string[] = [
    ...BaseFormElement.observedAttributes,
    'multiple',
    'accept',
    'max-size',
    'button-text',
    'drop-text',
  ];

  #_files: File[] = [];
  /** `true` après une interaction ou une validation : autorise l'affichage de l'erreur. */
  #_touched = false;

  /** Copie de la liste des fichiers choisis. */
  get files(): File[] {
    return [...this.#_files];
  }

  protected get control(): HTMLInputElement {
    return this.require<HTMLInputElement>('#input');
  }

  protected onConnect(): void {
    const input = this.control;
    const zone = this.require('.zone');
    this.resources.listen(input, 'change', () => {
      this.#_add([...(input.files ?? [])]);
      input.value = '';
    });
    this.resources.listen(zone, 'dragover', (event) => {
      event.preventDefault();
      if (!this.effectivelyDisabled) this.#_setState('dragging', true);
    });
    this.resources.listen(zone, 'dragleave', () => this.#_setState('dragging', false));
    this.resources.listen(zone, 'drop', (event) => {
      event.preventDefault();
      this.#_setState('dragging', false);
      if (!this.effectivelyDisabled) this.#_add([...((event as DragEvent).dataTransfer?.files ?? [])]);
    });
    this.resources.listen(this.require('#list'), 'click', (event) => {
      const button = (event.target as Element).closest<HTMLElement>('[data-index]');
      if (button) this.remove(Number(button.dataset.index));
    });
  }

  protected update(): void {
    const input = this.control;
    input.disabled = this.effectivelyDisabled;
    input.multiple = this.hasAttribute('multiple');
    input.accept = this.getAttribute('accept') ?? '';
    this.#_setState('disabled', input.disabled);
    this.#_setState('has-label', hasContent(this.query<HTMLSlotElement>('#label-slot')));
    this.require('#cta').textContent =
      this.getAttribute('button-text') || (input.multiple ? 'Parcourir les fichiers' : 'Parcourir');
    this.require('#drop').textContent = this.getAttribute('drop-text') ?? 'ou glissez-déposez ici';
    this.#_sync();
  }

  protected slotChanged(): void {
    this.#_setState('has-label', hasContent(this.query<HTMLSlotElement>('#label-slot')));
  }

  protected beforeValidate(): void {
    this.#_touched = true;
    this.#_sync();
  }

  protected onFormReset(): void {
    this.#_files = [];
    this.#_touched = false;
    this.#_sync();
  }

  protected onFormRestore(): void {
    // Un fichier ne peut pas être restauré : la liste reste vide.
    this.#_sync();
  }

  /**
   * Retire un fichier de la liste, ou l'élément du DOM si aucun index n'est donné
   * (comportement natif de `Element.remove()`).
   *
   * @param index - Position du fichier à retirer.
   */
  remove(index?: number): void {
    if (index === undefined) {
      super.remove();
      return;
    }
    this.#_files.splice(index, 1);
    this.#_touched = true;
    this.#_sync();
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /** Vide la liste des fichiers. */
  clear(): void {
    this.#_files = [];
    this.#_sync();
  }

  #_add(list: File[]): void {
    this.#_touched = true;
    this.#_files = this.hasAttribute('multiple') ? [...this.#_files, ...list] : list.slice(0, 1);
    this.#_sync();
    this.dispatchEvent(new Event('change', { bubbles: true }));
    this.emit('rds-input-file:change', { files: this.files });
  }

  /** Premier message d'erreur (poids, format, fichier requis), chaîne vide si valide. */
  #_error(): string {
    const maxMb = Number(this.getAttribute('max-size')) || 0;
    const accept = (this.getAttribute('accept') ?? '')
      .split(',')
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean);
    for (const file of this.#_files) {
      if (maxMb && file.size > maxMb * BYTES_PER_MB) return `« ${file.name} » dépasse ${maxMb} Mo.`;
      const accepted =
        !accept.length ||
        accept.some((rule) =>
          rule.startsWith('.')
            ? file.name.toLowerCase().endsWith(rule)
            : rule.endsWith('/*')
              ? file.type.startsWith(rule.slice(0, -1))
              : file.type === rule,
        );
      if (!accepted) return `Le format de « ${file.name} » n'est pas accepté.`;
    }
    if (this.required && !this.#_files.length) return 'Veuillez ajouter un fichier.';
    return '';
  }

  #_sync(): void {
    this.require('#list').replaceChildren(
      ...this.#_files.map((file, index) => {
        const item = document.createElement('li');
        const icon = new RotomecaIcon();
        icon.setAttribute('name', 'file');
        const name = document.createElement('span');
        name.className = 'name';
        name.textContent = file.name;
        const size = document.createElement('span');
        size.className = 'size';
        size.textContent = formatSize(file.size);
        const remove = new RotomecaIconButton();
        remove.setAttribute('size', 'sm');
        remove.setAttribute('icon', 'x');
        remove.setAttribute('label', `Retirer ${file.name}`);
        remove.dataset.index = String(index);
        item.append(icon, name, size, remove);
        return item;
      }),
    );

    const data = new FormData();
    for (const file of this.#_files) data.append(this.name || 'file', file);
    this.setFormValue(this.#_files.length ? data : null);

    const message = this.#_error();
    if (message) {
      this.setValidity(
        this.required && !this.#_files.length ? { valueMissing: true } : { customError: true },
        message,
        this.control,
      );
    } else this.setValidity();

    const show = !!message && this.#_touched;
    this.#_setState('error', show);
    const error = this.require('#error');
    error.hidden = !show;
    error.textContent = show ? message : '';
  }

  #_setState(name: string, on: boolean): void {
    if (on) this.internals.states.add(name);
    else this.internals.states.delete(name);
  }
}
