import { type Listing } from '@/src/db/types';

export const COMMUNES = [
  'Bandalungwa',
  'Barumbu',
  'Bumbu',
  'Gombe',
  'Kalamu',
  'Kasa-Vubu',
  'Kimbanseke',
  'Kinshasa',
  'Kintambo',
  'Kisenso',
  'Lemba',
  'Limete',
  'Lingwala',
  'Makala',
  'Maluku',
  'Masina',
  'Matete',
  'Mont-Ngafula',
  'Ndjili',
  'Ngaba',
  'Ngaliema',
  'Ngiri-Ngiri',
  'Nsele',
  'Selembao',
];

export const CDF_RATE = 2800;

export type Currency = 'USD' | 'CDF';

export function formatPrice(usd: number, currency: Currency): string {
  if (currency === 'CDF') {
    const cdf = Math.round(usd * CDF_RATE);
    return `${cdf.toLocaleString('fr-FR')} CDF`;
  }
  return `${usd.toLocaleString('fr-FR')} USD`;
}

export type Badge =
  | { kind: 'verified'; label: 'Vérifié'; color: 'green' }
  | { kind: 'partial'; label: 'Partiellement documenté'; color: 'amber' }
  | { kind: 'unverified'; label: 'Non vérifié'; color: 'gray' };

export function getBadge(listing: Listing): Badge {
  if (listing.verified) return { kind: 'verified', label: 'Vérifié', color: 'green' };
  const hasDoc = listing.doc_type && listing.doc_type.trim() !== '' && listing.doc_type.trim() !== 'Aucun';
  if (hasDoc) return { kind: 'partial', label: 'Partiellement documenté', color: 'amber' };
  return { kind: 'unverified', label: 'Non vérifié', color: 'gray' };
}

export const CATEGORY_LABELS: Record<string, string> = {
  buy: 'Acheter',
  rent: 'Louer',
  land: 'Terrain',
  hotel: 'Hôtels',
};

// Property types per category. "Terrain" now lives under Acheter (buy) instead
// of its own top-level tab; "land" category is retained for backward-compat
// with existing rows but is no longer selectable in the UI.
export const BUY_PROPERTY_TYPES = [
  'Maison',
  'Appartement',
  'Espace commercial',
  'Espace industriel',
  'Terrain',
] as const;

export const RENT_PROPERTY_TYPES = [
  'Maison',
  'Espace commercial',
  'Espace industriel',
  'Bureau',
  'Studio',
] as const;

export const LAND_USAGES = ['Résidentiel', 'Commercial', 'Agricole'] as const;

// Whether a property type shows residential fields (chambres, salles de bain).
export function isResidentialType(type: string, category: string): boolean {
  if (category === 'rent') return type === 'Maison' || type === 'Studio';
  return type === 'Maison' || type === 'Appartement';
}

// Whether a property type shows land-specific fields (dimensions, usage).
export function isLandType(type: string): boolean {
  return type === 'Terrain';
}

export function featuredPhoto(listing: Listing): string | null {
  return listing.photo_1 || listing.photo_2 || listing.photo_3 || null;
}
