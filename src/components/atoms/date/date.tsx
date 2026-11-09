import { Define } from '../../../core/scripts/decorators';
import { DateUtils } from '../../../core/scripts/utils/DateUtils';
import { Log } from '../../../core/scripts/utils/Log';
import { TAG_DATE } from '../../../core/scripts/utils/tags';
import type { UpdateContext } from '../../base/BaseElement';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import { RotomecaFragment } from '../fragment/fragment';
import style from './date.less';

export { RotomecaDate, EVENT_DATE_CHANGE };
export type { DateCreateOptions, DateChangeDetail };

/** Événement émis quand la date change. */
const EVENT_DATE_CHANGE = 'rds-date:change';

const ATTRIBUTE_DATE = 'date';
const ATTRIBUTE_FORMAT = 'format';
const ATTRIBUTE_LOCALE = 'locale';
const ATTRIBUTE_START_FORMAT = 'start-format';

const TEMPLATE = (
  <RotomecaFragment>
    <time id="text" part="date-text"></time>
    <slot hidden></slot>
  </RotomecaFragment>
);

/** Détail de l'événement {@link EVENT_DATE_CHANGE}. */
interface DateChangeDetail {
  newValue: Date | null;
  oldValue: Date | null;
}

/** Options de {@link RotomecaDate.Create}. */
interface DateCreateOptions {
  format?: string;
  locale?: string;
  startFormat?: string;
}

/** Entrées acceptées par {@link RotomecaDate.setDate}. */
type DateInput = string | Date | null;

/**
 * Affiche une date formatée, mise à jour dynamiquement.
 *
 * @remarks
 * La date vient, par priorité, de l'attribut `date`, du contenu texte, ou de la propriété `date`.
 * Elle est lue avec `start-format` si présent (ex. `dd/MM/yyyy`), sinon comme ISO 8601.
 * La valeur `now` donne la date courante.
 *
 * Tokens de `format` : `P` (court), `PP` (moyen), `PPP` (long), `PPPP` (complet), `yyyy`, `yy`,
 * `M`, `MM`, `MMM`, `MMMM`, `d`, `dd`, `E`, `EEEE`, `H`, `HH`, `m`, `mm`, `s`, `ss`.
 * `locale` accepte les codes `Intl` (`fr`, `en`, `fr_FR`...).
 *
 * États : `:state(invalid)` quand la date est absente ou invalide.
 * Événement : `rds-date:change` (`detail: { newValue, oldValue }`).
 *
 * @example
 * ```html
 * <rds-date format="P">1997-08-12</rds-date>
 * <rds-date format="PPPP" start-format="dd/MM/yyyy">12/08/1997</rds-date>
 * <rds-date format="dd/MM/yyyy HH:mm" date="1997-08-12T15:30:00"></rds-date>
 * <rds-date format="PPPP" locale="en" date="now"></rds-date>
 * ```
 */
@Define({ tag: TAG_DATE, template: TEMPLATE, styles: style })
class RotomecaDate extends BaseElementInternal {
  static observedAttributes: string[] = [
    ATTRIBUTE_DATE,
    ATTRIBUTE_FORMAT,
    ATTRIBUTE_LOCALE,
    ATTRIBUTE_START_FORMAT,
  ];
  static upgradeProperties = ['date', 'format', 'locale', 'startFormat'];

  /** Source de la date, conservée pour la relire si `start-format` change. */
  #_source: DateInput = null;
  #_date: Date | null = null;

  /** Date affichée, ou `null`. */
  get date(): Date | null {
    return this.#_date;
  }
  set date(value: DateInput) {
    this.setDate(value);
  }

  /** Format d'affichage (attribut `format`). */
  get format(): string {
    return this.stringAttribute(ATTRIBUTE_FORMAT) || DateUtils.DEFAULT_FORMAT;
  }
  set format(value: string) {
    this.setAttribute(ATTRIBUTE_FORMAT, value);
  }

  /** Locale d'affichage (attribut `locale`). */
  get locale(): string {
    return this.stringAttribute(ATTRIBUTE_LOCALE) || DateUtils.DEFAULT_LOCALE;
  }
  set locale(value: string) {
    this.setAttribute(ATTRIBUTE_LOCALE, value);
  }

  /** Format de lecture des chaînes (attribut `start-format`), ou `''`. */
  get startFormat(): string {
    return this.stringAttribute(ATTRIBUTE_START_FORMAT);
  }
  set startFormat(value: string) {
    this.setAttribute(ATTRIBUTE_START_FORMAT, value);
  }

  protected update(context: UpdateContext): void {
    const { attributes } = context;
    if (attributes.has(ATTRIBUTE_DATE)) this.#_loadFromAttributeOrText();
    else if (attributes.has(ATTRIBUTE_START_FORMAT) && typeof this.#_source === 'string')
      this.#_apply(this.#_source);
    this.#_render();
  }

  protected slotChanged(): void {
    if (this.hasAttribute(ATTRIBUTE_DATE)) return;
    // Un contenu vide ne doit pas effacer une date définie en JS (ex. à la reconnexion).
    const text = this.textContent?.trim();
    if (text && text !== this.#_source) this.#_apply(text);
  }

  /**
   * Définit la date.
   *
   * @param input - `Date`, chaîne (lue avec `start-format`, ou ISO), `now`, ou `null`.
   */
  setDate(input: DateInput): void {
    this.#_apply(input);
  }

  /** Date affichée, ou `null`. */
  getDate(): Date | null {
    return this.#_date;
  }

  /** Ajoute des jours à la date (sans effet si elle est absente). */
  addDays(days: number): void {
    if (this.#_date) this.setDate(DateUtils.addDays(this.#_date, days));
  }

  /** Ajoute des mois à la date (sans effet si elle est absente). */
  addMonths(months: number): void {
    if (this.#_date) this.setDate(DateUtils.addMonths(this.#_date, months));
  }

  /** Ajoute des années à la date (sans effet si elle est absente). */
  addYears(years: number): void {
    if (this.#_date) this.setDate(DateUtils.addYears(this.#_date, years));
  }

  #_loadFromAttributeOrText(): void {
    const text = this.getAttribute(ATTRIBUTE_DATE) ?? this.textContent?.trim();
    this.#_apply(text || null);
  }

  #_apply(input: DateInput): void {
    this.#_source = input;
    let next: Date | null = null;

    if (input instanceof Date) next = input;
    else if (typeof input === 'string') {
      const startFormat = this.startFormat;
      next =
        startFormat && input.trim() !== 'now'
          ? DateUtils.parse(input, startFormat)
          : DateUtils.parseAuto(input);
    }
    if (!DateUtils.isValid(next)) next = null;

    const previous = this.#_date;
    if (previous?.getTime() === next?.getTime()) return;

    this.#_date = next;
    this.requestUpdate('date');
    this.emit<DateChangeDetail>(EVENT_DATE_CHANGE, { newValue: next, oldValue: previous });
  }

  #_render(): void {
    const output = this.require<HTMLTimeElement>('#text');
    this._p_clearStates();

    if (!this.#_date) {
      output.textContent = '';
      output.removeAttribute('datetime');
      this._p_addState('invalid');
      return;
    }

    output.dateTime = DateUtils.toISODate(this.#_date);
    try {
      output.textContent = DateUtils.format(this.#_date, this.format, this.locale);
    } catch (error) {
      Log.error(
        'rds-date',
        `Erreur de formatage (format "${this.format}", locale "${this.locale}")`,
        error,
      );
      output.textContent = 'Date invalide';
      this._p_addState('invalid');
    }
  }

  /**
   * Crée un élément `rds-date`.
   *
   * @param dateInput - Date, ou chaîne placée en contenu texte.
   * @param options - Format, locale et format de lecture.
   */
  static Create(dateInput?: string | Date, options: DateCreateOptions = {}): RotomecaDate {
    const element = document.createElement(TAG_DATE) as RotomecaDate;
    if (options.format) element.format = options.format;
    if (options.locale) element.locale = options.locale;
    if (options.startFormat) element.startFormat = options.startFormat;

    if (typeof dateInput === 'string') element.append(dateInput);
    else if (dateInput) element.date = dateInput;

    return element;
  }
}
