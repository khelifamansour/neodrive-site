/** Numéro de série (VIN, ISO 3779) : format et chiffre de contrôle. Utilisable côté navigateur et serveur. */
export const VIN_FORMAT = /^[A-HJ-NPR-Z0-9]{17}$/;
const VAL: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9, S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9 };
const W = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
/** Majuscules, sans espaces ni tirets ; I→1, O/Q→0 (lettres interdites dans un VIN, souvent mal lues). */
export const cleanVin = (s: unknown) => String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/I/g, "1").replace(/[OQ]/g, "0");
/** Chiffre de contrôle attendu en 9e position (0-9 ou X). */
export function vinCheckDigit(vin: string) {
  let sum = 0;
  for (let i = 0; i < 17; i++) { const ch = vin[i]; const v = /\d/.test(ch) ? Number(ch) : VAL[ch]; if (v == null) return null; sum += v * W[i]; }
  const r = sum % 11; return r === 10 ? "X" : String(r);
}
/** true : chiffre de contrôle correct ; false : incorrect (erreur de lecture possible, ou constructeur qui ne l'utilise pas). */
export const vinCheckOk = (vin: string) => VIN_FORMAT.test(vin) && vinCheckDigit(vin) === vin[8];
