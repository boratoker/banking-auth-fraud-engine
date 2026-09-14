/**
 * Turkish character-insensitive and diacritics-insensitive normalization.
 * Maps:
 * - 'ı', 'i', 'İ', 'I' -> 'i'
 * - 'ş', 'Ş' -> 's'
 * - 'ç', 'Ç' -> 'c'
 * - 'ğ', 'Ğ' -> 'g'
 * - 'ü', 'Ü' -> 'u'
 * - 'ö', 'Ö' -> 'o'
 * Example:
 * normalizeTurkish('Ayşe') === normalizeTurkish('Ayse') // true
 * normalizeTurkish('Lımıt') === normalizeTurkish('Limit') // true
 */
export const normalizeTurkish = (str) => {
  if (!str) return '';
  return str
    .toString()
    .trim()
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};
