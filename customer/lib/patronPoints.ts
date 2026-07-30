/**
 * Patron points: 1 point per $100 spent (order total).
 * Only orders with successful payment AND successful delivery count.
 *
 * Tiers: Member → Bronze (100) → Silver (250) → Gold (500) → Platinum (1000)
 */

export type PatronTierId = 'member' | 'bronze' | 'silver' | 'gold' | 'platinum';

export type PatronTier = {
  id: PatronTierId;
  label: string;
  minPoints: number;
  /** Points needed to reach the next tier (null at top). */
  nextMin: number | null;
  nextLabel: string | null;
  accent: string;
  bar: string;
};

export const PATRON_TIERS: PatronTier[] = [
  {
    id: 'member',
    label: 'Member',
    minPoints: 0,
    nextMin: 100,
    nextLabel: 'Bronze',
    accent: '#D4A373',
    bar: '#D4A373',
  },
  {
    id: 'bronze',
    label: 'Bronze Patron',
    minPoints: 100,
    nextMin: 250,
    nextLabel: 'Silver',
    accent: '#CD7F32',
    bar: '#CD7F32',
  },
  {
    id: 'silver',
    label: 'Silver Patron',
    minPoints: 250,
    nextMin: 500,
    nextLabel: 'Gold',
    accent: '#C0C0C0',
    bar: '#C0C0C0',
  },
  {
    id: 'gold',
    label: 'Gold Patron',
    minPoints: 500,
    nextMin: 1000,
    nextLabel: 'Platinum',
    accent: '#E8C46A',
    bar: '#E8C46A',
  },
  {
    id: 'platinum',
    label: 'Platinum Patron',
    minPoints: 1000,
    nextMin: null,
    nextLabel: null,
    accent: '#A8B8C8',
    bar: '#A8B8C8',
  },
];

function isSuccessfulPayment(paymentStatus?: string, deliveryStatus?: string): boolean {
  const pay = String(paymentStatus || '').toUpperCase();
  if (!pay) return false;
  if (pay.includes('REFUND') || pay.includes('CANCEL') || pay.includes('FAIL')) return false;
  if (pay.includes('PAID')) return true;
  // COD is collected on delivery — count only once delivered
  if (pay.includes('CASH') || pay.includes('COD')) {
    return isSuccessfulDelivery(deliveryStatus);
  }
  return false;
}

function isSuccessfulDelivery(deliveryStatus?: string): boolean {
  const delivery = String(deliveryStatus || '').toLowerCase().trim();
  if (!delivery) return false;
  if (delivery.includes('cancel') || delivery.includes('fail') || delivery.includes('return')) {
    return false;
  }
  // Delivered / delivery complete (not merely "out for delivery")
  return /\bdelivered\b|delivery\s*complete|successfully\s*deliver/i.test(delivery);
}

/** Points only after paid + delivered (COD counts when delivered). */
export function isCountableOrder(paymentStatus?: string, deliveryStatus?: string): boolean {
  return (
    isSuccessfulPayment(paymentStatus, deliveryStatus) && isSuccessfulDelivery(deliveryStatus)
  );
}

/** Sum unique checkout totals → integer points ($100 spent = 1 point). */
export function pointsFromOrders(
  rows: Array<{
    orderId?: string;
    id?: number | string;
    _id?: number | string;
    totalAmt?: number | string;
    lineTotal?: number | string;
    payment_status?: string;
    delivery_status?: string;
  }>,
): number {
  const byGroup = new Map<string, number>();
  for (const row of rows) {
    if (!isCountableOrder(row.payment_status, row.delivery_status)) continue;
    const key = String(row.orderId || row.id || row._id || '');
    if (!key) continue;
    const total = Number(row.totalAmt ?? row.lineTotal ?? 0);
    if (!Number.isFinite(total) || total <= 0) continue;
    byGroup.set(key, Math.max(byGroup.get(key) || 0, total));
  }
  let spent = 0;
  for (const v of byGroup.values()) spent += v;
  return Math.max(0, Math.floor(spent / 100));
}

export function resolvePatronTier(points: number): {
  tier: PatronTier;
  points: number;
  progress: number;
  progressLabel: string;
} {
  const pts = Math.max(0, Math.floor(points));
  let tier = PATRON_TIERS[0];
  for (const t of PATRON_TIERS) {
    if (pts >= t.minPoints) tier = t;
  }

  if (!tier.nextMin) {
    return {
      tier,
      points: pts,
      progress: 1,
      progressLabel: `${pts.toLocaleString()} pts · top tier`,
    };
  }

  const span = tier.nextMin - tier.minPoints;
  const into = pts - tier.minPoints;
  const progress = span > 0 ? Math.min(1, Math.max(0, into / span)) : 0;
  return {
    tier,
    points: pts,
    progress,
    progressLabel: `${pts.toLocaleString()} / ${tier.nextMin.toLocaleString()} pts to ${tier.nextLabel}`,
  };
}

export function formatMemberSince(createdAt?: string | null): string {
  if (!createdAt) return '';
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
