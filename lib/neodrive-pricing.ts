/** Barème central NeoDrive : ne jamais inventer un prix pour un code postal non vérifié. */
export const VEHICLES = {
  essentielle: { label: "NeoDrive Essentielle", price: 3990 },
  confort: { label: "NeoDrive Confort", price: 4990 },
  confortPlus: { label: "NeoDrive Confort Plus", price: 5990 },
} as const;
export type VehicleKey = keyof typeof VEHICLES;
export const REGISTRATION_PRICE = 150;
const Z1 = new Set(["31","81","82","32","09"]);
const Z2 = new Set(["11","12","46","47","33","65","66","34","30","40","24","19","87","15"]);
const Z3 = new Set(["75","92","93","94","95","77","78","91","13","69","63","16","17","86"]);
const DEPARTMENTS = new Set(("01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 21 22 23 24 25 26 27 28 29 2A 2B 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49 50 51 52 53 54 55 56 57 58 59 60 61 62 63 64 65 66 67 68 69 70 71 72 73 74 75 76 77 78 79 80 81 82 83 84 85 86 87 88 89 90 91 92 93 94 95 971 972 973 974 975 976 977 978 984 986 987 988").split(" "));
export function departmentFromPostalCode(postal: string): string | null {
  if (!/^[0-9]{5}$/.test(postal)) return null;
  if (postal.startsWith("97") || postal.startsWith("98")) return postal.slice(0,3);
  const n = Number(postal);
  if (n >= 20000 && n <= 20190) return "2A";
  if (n >= 20200 && n <= 20999) return "2B";
  const dept = postal.slice(0,2);
  return DEPARTMENTS.has(dept) ? dept : null;
}
export type DeliveryQuote = { status:"estimated"; department:string; price:number; zone:number } | { status:"manual"; department:string|null; reason:string };
export function quoteDelivery(postal:string): DeliveryQuote {
  const dept=departmentFromPostalCode(postal);
  if (!dept) return {status:"manual",department:null,reason:"Code postal à vérifier"};
  if (dept==="2A" || dept==="2B" || dept.length===3) return {status:"manual",department:dept,reason:"Transport spécifique : devis personnalisé"};
  if (!DEPARTMENTS.has(dept)) return {status:"manual",department:dept,reason:"Destination à confirmer"};
  const zone=Z1.has(dept)?1:Z2.has(dept)?2:Z3.has(dept)?3:4;
  return {status:"estimated",department:dept,zone,price:zone===1?450:zone===2?590:zone===3?690:790};
}
export function calculateQuote(vehicle:VehicleKey, postal:string, registration:boolean) {
  const delivery=quoteDelivery(postal);
  const vehiclePrice=VEHICLES[vehicle].price;
  const registrationPrice=registration?REGISTRATION_PRICE:0;
  return {vehiclePrice,registrationPrice,delivery,total:delivery.status==="estimated"?vehiclePrice+registrationPrice+delivery.price:null};
}
