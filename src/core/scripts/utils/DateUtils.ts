export { DateUtils };
export type { DateLocale };

/** Locale d'affichage : code `Intl` (`fr`, `en`, `fr-FR`, ou `fr_FR`). */
type DateLocale = string;

/** Découpe un format en tokens ; un texte entre `'…'` ou tout autre caractère est littéral. */
const TOKEN_REGEX = /'([^']*)'|P{1,4}|y{4}|y{2}|M{1,4}|d{1,2}|E{1,4}|H{1,2}|m{1,2}|s{1,2}/g;

/** Unités de la date relative, de la plus grande à la plus petite (durée en secondes). */
const RELATIVE_UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
];

const DATE_STYLES: Record<string, Intl.DateTimeFormatOptions['dateStyle']> = {
  P: 'short',
  PP: 'medium',
  PPP: 'long',
  PPPP: 'full',
};

const pad = (value: number, length = 2): string => String(value).padStart(length, '0');

/**
 * Utilitaires de date : formatage par tokens, parsing et calculs, sans dépendance externe.
 *
 * @remarks
 * Tokens de format :
 * - `P` / `PP` / `PPP` / `PPPP` : formats `Intl` court, moyen, long, complet
 * - `yyyy`, `yy` : année sur 4 / 2 chiffres
 * - `M`, `MM`, `MMM`, `MMMM` : mois numérique, avec zéro initial, abrégé, complet
 * - `d`, `dd` : jour du mois sans / avec zéro initial
 * - `E` (à `EEE`), `EEEE` : jour de la semaine abrégé / complet
 * - `H`, `HH`, `m`, `mm`, `s`, `ss` : heures (0-23), minutes, secondes
 *
 * Le parsing (`parse`) ne gère que les tokens numériques.
 */
abstract class DateUtils {
  /** Locale utilisée quand aucune n'est fournie. */
  static readonly DEFAULT_LOCALE: DateLocale = 'fr';
  /** Format utilisé quand aucun n'est fourni. */
  static readonly DEFAULT_FORMAT = 'P';
  /** Format spécial : date relative à maintenant (« il y a 3 jours »). */
  static readonly RELATIVE_FORMAT = 'relative';

  /**
   * Date relative à maintenant, avec `Intl.RelativeTimeFormat` (`numeric: 'auto'` : « hier », « demain »).
   *
   * @param date - Date à situer.
   * @param locale - Locale `Intl` (déjà normalisée ou non).
   * @returns Le texte, ex. « il y a 3 jours », « dans 2 heures ».
   */
  static relative(date: Date, locale: DateLocale = DateUtils.DEFAULT_LOCALE): string {
    const rtf = new Intl.RelativeTimeFormat(DateUtils.normalizeLocale(locale), { numeric: 'auto' });
    const diff = (date.getTime() - Date.now()) / 1000;
    for (const [unit, seconds] of RELATIVE_UNITS) {
      if (Math.abs(diff) >= seconds) return rtf.format(Math.round(diff / seconds), unit);
    }
    return rtf.format(Math.round(diff), 'second');
  }

  /** Convertit `fr_FR` en `fr-FR` et vérifie la locale.
   * @throws {RangeError} Si la locale n'est pas valide. */
  static normalizeLocale(locale: DateLocale): string {
    const normalized = locale.replace(/_/g, '-');
    Intl.getCanonicalLocales(normalized);
    return normalized;
  }

  /** `true` si `date` est une date valide. */
  static isValid(date: unknown): date is Date {
    return date instanceof Date && !Number.isNaN(date.getTime());
  }

  /**
   * Formate une date selon un format à tokens.
   *
   * @param date - Date à formater.
   * @param format - Format (ex. `dd/MM/yyyy HH:mm`, `PPPP`).
   * @param locale - Locale d'affichage.
   * @throws {RangeError} Si la date ou la locale est invalide.
   */
  static format(date: Date, format: string, locale: DateLocale = DateUtils.DEFAULT_LOCALE): string {
    if (!DateUtils.isValid(date)) throw new RangeError('Date invalide');
    const tag = DateUtils.normalizeLocale(locale);
    if (format === DateUtils.RELATIVE_FORMAT) return DateUtils.relative(date, tag);
    const intl = (options: Intl.DateTimeFormatOptions): string =>
      new Intl.DateTimeFormat(tag, options).format(date);

    return format.replace(TOKEN_REGEX, (token, literal?: string) => {
      if (literal !== undefined) return literal;
      if (token[0] === 'P') return intl({ dateStyle: DATE_STYLES[token] });
      switch (token) {
        case 'yyyy':
          return pad(date.getFullYear(), 4);
        case 'yy':
          return pad(date.getFullYear() % 100);
        case 'M':
          return String(date.getMonth() + 1);
        case 'MM':
          return pad(date.getMonth() + 1);
        case 'MMM':
          return intl({ month: 'short' });
        case 'MMMM':
          return intl({ month: 'long' });
        case 'd':
          return String(date.getDate());
        case 'dd':
          return pad(date.getDate());
        case 'EEEE':
          return intl({ weekday: 'long' });
        case 'H':
          return String(date.getHours());
        case 'HH':
          return pad(date.getHours());
        case 'm':
          return String(date.getMinutes());
        case 'mm':
          return pad(date.getMinutes());
        case 's':
          return String(date.getSeconds());
        case 'ss':
          return pad(date.getSeconds());
        default: // E, EE, EEE
          return intl({ weekday: 'short' });
      }
    });
  }

  /**
   * Analyse une chaîne selon un format à tokens numériques.
   *
   * @param input - Texte à analyser (ex. `12/08/1997`).
   * @param format - Format (ex. `dd/MM/yyyy`).
   * @returns La date, ou `null` si le texte ne correspond pas, si le format contient un token non
   * numérique, ou si la date n'existe pas (ex. `31/02`).
   */
  static parse(input: string, format: string): Date | null {
    const order: string[] = [];
    let unsupported = false;
    let last = 0;
    let pattern = '^';
    const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    for (const match of format.matchAll(TOKEN_REGEX)) {
      const token = match[0];
      pattern += escape(format.slice(last, match.index));
      last = match.index + token.length;
      if (/^(P+|M{3,}|E+)$/.test(token)) unsupported = true;
      order.push(token);
      pattern += token === 'yyyy' ? '(\\d{4})' : token.length === 2 ? '(\\d{2})' : '(\\d{1,2})';
    }
    if (unsupported || order.length === 0) return null;
    pattern += `${escape(format.slice(last))}$`;

    const found = new RegExp(pattern).exec(input.trim());
    if (!found) return null;

    const parts = { y: 1970, M: 1, d: 1, H: 0, m: 0, s: 0 };
    order.forEach((token, index) => {
      const value = Number(found[index + 1]);
      const key = token[0] as keyof typeof parts;
      parts[key] = token === 'yy' ? (value < 70 ? 2000 + value : 1900 + value) : value;
    });

    const date = new Date(parts.y, parts.M - 1, parts.d, parts.H, parts.m, parts.s);
    // Rejette les débordements (31/02 -> 03/03).
    const exact =
      date.getFullYear() === parts.y &&
      date.getMonth() === parts.M - 1 &&
      date.getDate() === parts.d &&
      date.getHours() === parts.H &&
      date.getMinutes() === parts.m &&
      date.getSeconds() === parts.s;
    return exact ? date : null;
  }

  /**
   * Analyse une date sans format : `now`, ISO 8601 ou tout ce que `Date` accepte.
   * Une date seule (`1997-08-12`) est lue en heure locale, pas en UTC, pour ne pas décaler le jour.
   */
  static parseAuto(input: string): Date | null {
    const text = input.trim();
    if (text === 'now') return new Date();
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    const date = dateOnly
      ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
      : new Date(text);
    return DateUtils.isValid(date) ? date : null;
  }

  /** Date locale au format ISO `yyyy-MM-ddTHH:mm:ss` (valeur de l'attribut `datetime` de `<time>`). */
  static toISODate(date: Date): string {
    return (
      `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
      `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    );
  }

  /** Nouvelle date décalée de `days` jours. */
  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /** Nouvelle date décalée de `months` mois (le jour est borné au dernier jour du mois). */
  static addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    const day = result.getDate();
    result.setDate(1);
    result.setMonth(result.getMonth() + months);
    const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
    result.setDate(Math.min(day, lastDay));
    return result;
  }

  /** Nouvelle date décalée de `years` années. */
  static addYears(date: Date, years: number): Date {
    return DateUtils.addMonths(date, years * 12);
  }
}
