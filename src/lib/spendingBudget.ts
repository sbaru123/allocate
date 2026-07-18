import { supabase } from '@/lib/supabase'
import type { PayFrequency } from '@/types'

export const SPENDING_LABEL = 'Spending'

export function isSpendingLabel(label: string) {
  return label.trim().toLowerCase() === SPENDING_LABEL.toLowerCase()
}

export function getWeeksPerPeriod(freq: PayFrequency) {
  if (freq === 'weekly') return 1
  if (freq === 'monthly') return 4
  return 2
}

export function weeklyFromPercent(pct: number, latestPaycheck: number, payFrequency: PayFrequency) {
  if (!(latestPaycheck > 0)) return 0
  return Math.round(((latestPaycheck * pct / 100) / getWeeksPerPeriod(payFrequency)) * 100) / 100
}

export function percentFromWeekly(weekly: number, latestPaycheck: number, payFrequency: PayFrequency) {
  if (!(latestPaycheck > 0)) return null
  return Math.round((weekly * getWeeksPerPeriod(payFrequency) / latestPaycheck) * 10000) / 100
}

/**
 * Persists the weekly spending budget. Profiles is the source of truth
 * (Home falls back to it); budgets is mirrored best-effort.
 */
export default async function saveWeeklyBudget(uid: string, weekly: number) {
  const profileRes = await supabase
    .from('profiles')
    .upsert({ id: uid, weekly_budget: weekly }, { onConflict: 'id' })
  if (profileRes.error) throw profileRes.error

  const budgetRes = await supabase
    .from('budgets')
    .upsert({ user_id: uid, weekly_budget: weekly }, { onConflict: 'user_id' })
  if (budgetRes.error) console.error('[budget] budgets upsert:', budgetRes.error)
}
