import { Define } from '../../../core/scripts/decorators';
import {
  TAG_INPUT_COLOR,
  TAG_INPUT_DATE,
  TAG_INPUT_DATETIME,
  TAG_INPUT_EMAIL,
  TAG_INPUT_NUMBER,
  TAG_INPUT_PASSWORD,
  TAG_INPUT_RANGE,
  TAG_INPUT_SEARCH,
  TAG_INPUT_TEL,
  TAG_INPUT_TEXT,
  TAG_INPUT_TIME,
  TAG_INPUT_URL,
} from '../../../core/scripts/utils/tags';
import { RotomecaInput, type InputButtonConfig } from './input';

export {
  RotomecaInputColor,
  RotomecaInputDate,
  RotomecaInputDateTime,
  RotomecaInputEmail,
  RotomecaInputNumber,
  RotomecaInputPassword,
  RotomecaInputRange,
  RotomecaInputSearch,
  RotomecaInputTel,
  RotomecaInputText,
  RotomecaInputTime,
  RotomecaInputUrl,
};

/** Pose un attribut sur l'input interne s'il n'a pas été fourni par l'utilisateur de l'hôte. */
function defaultAttribute(host: HTMLElement, input: HTMLInputElement, name: string, value: string) {
  if (host.hasAttribute(name)) return;
  if (input.getAttribute(name) !== value) input.setAttribute(name, value);
}

/**
 * Champ texte sur une ligne (`type="text"` figé).
 *
 * @example
 * ```html
 * <rds-input-text name="nom" required>Nom</rds-input-text>
 * ```
 */
@Define({ tag: TAG_INPUT_TEXT })
class RotomecaInputText extends RotomecaInput {
  static inputType = 'text';
}

/**
 * Champ numérique (`min`, `max`, `step`).
 *
 * @example
 * ```html
 * <rds-input-number name="qty" min="0" max="10" step="1">Quantité</rds-input-number>
 * ```
 */
@Define({ tag: TAG_INPUT_NUMBER })
class RotomecaInputNumber extends RotomecaInput {
  static inputType = 'number';

  protected configureInput(input: HTMLInputElement): void {
    defaultAttribute(this, input, 'inputmode', 'decimal');
  }

  /** Incrémente la valeur de `n` pas (`step`). */
  stepUp(n = 1): void {
    this.inputElement.stepUp(n);
    this.refreshInput();
  }

  /** Décrémente la valeur de `n` pas (`step`). */
  stepDown(n = 1): void {
    this.inputElement.stepDown(n);
    this.refreshInput();
  }
}

/** Champ date (`min`, `max`, `valueAsDate`). */
@Define({ tag: TAG_INPUT_DATE })
class RotomecaInputDate extends RotomecaInput {
  static inputType = 'date';
}

/** Champ heure (`min`, `max`, `step`). */
@Define({ tag: TAG_INPUT_TIME })
class RotomecaInputTime extends RotomecaInput {
  static inputType = 'time';
}

/** Champ date et heure locales (`datetime-local`). */
@Define({ tag: TAG_INPUT_DATETIME })
class RotomecaInputDateTime extends RotomecaInput {
  static inputType = 'datetime-local';
}

/**
 * Champ mot de passe, avec un bouton « en ligne » pour afficher ou masquer la saisie.
 *
 * @fires {CustomEvent<{visible: boolean}>} rds-input-password:toggle - Affichage basculé.
 */
@Define({ tag: TAG_INPUT_PASSWORD })
class RotomecaInputPassword extends RotomecaInput {
  static inputType = 'password';

  #_visible = false;

  /** `true` si le mot de passe est affiché en clair. */
  get visible(): boolean {
    return this.#_visible;
  }
  set visible(value: boolean) {
    this.#_visible = value;
    void this.requestUpdate('visible');
  }

  protected resolveType(): string {
    return this.#_visible ? 'text' : 'password';
  }

  protected configureInput(input: HTMLInputElement): void {
    defaultAttribute(this, input, 'autocomplete', 'current-password');
  }

  protected resolveButton(): InputButtonConfig {
    return this.#_visible
      ? { icon: 'eye-off', label: 'Masquer le mot de passe', variant: 'tertiary' }
      : { icon: 'eye', label: 'Afficher le mot de passe', variant: 'tertiary' };
  }

  protected onButtonClick(): void {
    this.visible = !this.#_visible;
    this.emit('rds-input-password:toggle', { visible: this.#_visible });
  }
}

/**
 * Champ de recherche, avec un bouton « en ligne » pour effacer la saisie (Échap l'efface aussi).
 *
 * @fires {CustomEvent<{value: string}>} rds-input-search:submit - Touche Entrée.
 * @fires {Event} rds-input-search:clear - Saisie effacée par le bouton.
 */
@Define({ tag: TAG_INPUT_SEARCH })
class RotomecaInputSearch extends RotomecaInput {
  static inputType = 'search';
  static defaultIcon = 'search';

  protected onConnect(): void {
    super.onConnect();
    this.resources.listen(this.inputElement, 'keydown', (event) => {
      if ((event as KeyboardEvent).key === 'Enter')
        this.emit('rds-input-search:submit', { value: this.value });
      if ((event as KeyboardEvent).key === 'Escape' && this.value) {
        this.value = '';
        this.emit('rds-input-search:clear', null);
      }
    });
  }

  protected resolveButton(): InputButtonConfig | null {
    return this.value
      ? { icon: 'x', label: 'Effacer la recherche', variant: 'tertiary' }
      : null;
  }

  protected onButtonClick(): void {
    this.value = '';
    this.inputElement.focus();
    this.emit('rds-input-search:clear', null);
  }
}

/** Champ adresse e-mail. */
@Define({ tag: TAG_INPUT_EMAIL })
class RotomecaInputEmail extends RotomecaInput {
  static inputType = 'email';
  static defaultIcon = 'mail';

  protected configureInput(input: HTMLInputElement): void {
    defaultAttribute(this, input, 'autocomplete', 'email');
    defaultAttribute(this, input, 'inputmode', 'email');
  }
}

/** Champ numéro de téléphone. */
@Define({ tag: TAG_INPUT_TEL })
class RotomecaInputTel extends RotomecaInput {
  static inputType = 'tel';
  static defaultIcon = 'phone';

  protected configureInput(input: HTMLInputElement): void {
    defaultAttribute(this, input, 'autocomplete', 'tel');
    defaultAttribute(this, input, 'inputmode', 'tel');
  }
}

/** Champ adresse web. */
@Define({ tag: TAG_INPUT_URL })
class RotomecaInputUrl extends RotomecaInput {
  static inputType = 'url';
  static defaultIcon = 'link';

  protected configureInput(input: HTMLInputElement): void {
    defaultAttribute(this, input, 'autocomplete', 'url');
    defaultAttribute(this, input, 'inputmode', 'url');
  }
}

/** Sélecteur de couleur (valeur hexadécimale `#rrggbb`). */
@Define({ tag: TAG_INPUT_COLOR })
class RotomecaInputColor extends RotomecaInput {
  static inputType = 'color';
}

/** Curseur (`min`, `max`, `step`) à piste stylée, qui affiche sa valeur courante. */
@Define({ tag: TAG_INPUT_RANGE })
class RotomecaInputRange extends RotomecaInput {
  static inputType = 'range';

  protected resolveOutput(): string {
    const input = this.inputElement;
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    // Piste remplie jusqu'à la valeur (lue par input.less).
    this.inputElement.style.setProperty(
      '--_pct',
      `${((Number(input.value) - min) / (max - min || 1)) * 100}%`,
    );
    return input.value;
  }
}
