import { supabase } from '@/lib/supabase'

/**
 * Restores dashboard tables from the onboarding data stored in localStorage.
 * Called when localStorage says onboarding is complete but the DB rows are missing
 * (happens when the user completed onboarding before the tables were created).
 */
async function backfillFromLocalStorage(uid: string, data: Record<string, unknown>) {
  // Profiles
  await supabase.from('profiles').upsert({
    id: uid,
    onboarding_completed: true,
    onboarding_step: 4,
    pay_frequency: data.pay_frequency,
    paycheck_amount: data.paycheck_amount,
    buckets: data.buckets,
    weekly_budget: data.weekly_budget,
    weekly_breakdown: data.weekly_breakdown,
    goal: data.goal ?? null,
  }, { onConflict: 'id' })

  // Budgets
  await supabase.from('budgets').delete().eq('user_id', uid)
  await supabase.from('budgets').insert({
    user_id: uid,
    pay_frequency: (data.pay_frequency as string) || 'biweekly',
    weekly_budget: (data.weekly_budget as number) || 0,
  })

  // Paychecks — only insert if none exist yet
  const { data: existing } = await supabase
    .from('paychecks')
    .select('id')
    .eq('user_id', uid)
    .limit(1)

  if (!existing || existing.length === 0) {
    await supabase.from('paychecks').insert({
      user_id: uid,
      amount: (data.paycheck_amount as number) || 0,
      note: 'Initial paycheck',
    })
  }

  // Allocations
  const buckets = data.buckets as Array<{ name: string; color: string; percent: number }>
  if (Array.isArray(buckets) && buckets.length > 0) {
    await supabase.from('allocations').delete().eq('user_id', uid)
    await supabase.from('allocations').insert(
      buckets.map(function (b) {
        return { user_id: uid, label: b.name, percentage: b.percent }
      })
    )
  }
}

/**
 * Three-tier check for whether a user has completed onboarding:
 *  1. profiles.onboarding_completed column (primary source)
 *  2. localStorage mirror — if it says complete but DB is empty, backfills the DB
 *     automatically so the dashboard has data without re-running onboarding
 *  3. Existence of allocations rows (catch-all for any other edge case)
 */
export async function isOnboardingCompleted(uid: string): Promise<boolean> {
  // ── 1. profiles table ──────────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', uid)
    .single()

  if (profile?.onboarding_completed === true) return true

  // ── 2. localStorage mirror ─────────────────────────────────────
  const lsRaw = localStorage.getItem(`allocate_ob_${uid}`)
  let lsData: Record<string, unknown> | null = null
  if (lsRaw) {
    try { lsData = JSON.parse(lsRaw) as Record<string, unknown> } catch { /* ignore */ }
  }

  if (lsData?.onboarding_completed === true) {
    // localStorage says done. Check if DB is empty (failed writes from before tables existed).
    const { data: allocations } = await supabase
      .from('allocations')
      .select('id')
      .eq('user_id', uid)
      .limit(1)

    if (!allocations || allocations.length === 0) {
      // DB is empty — restore from localStorage so the dashboard has data
      await backfillFromLocalStorage(uid, lsData)
    }

    return true
  }

  // ── 3. Existing allocations (catch-all) ────────────────────────
  const { data: allocations } = await supabase
    .from('allocations')
    .select('id')
    .eq('user_id', uid)
    .limit(1)

  if (allocations && allocations.length > 0) {
    // Backfill profiles row so future logins resolve on check 1
    await supabase
      .from('profiles')
      .upsert({ id: uid, onboarding_completed: true }, { onConflict: 'id' })
    return true
  }

  return false
}
