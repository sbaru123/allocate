import { supabase } from '@/lib/supabase'

type Bucket = { name: string; percent: number }

type OnboardingSnapshot = {
  onboarding_completed?: boolean
  pay_frequency?: string
  paycheck_amount?: number
  buckets?: Bucket[]
  weekly_budget?: number
}

function readLocalSnapshot(uid: string): OnboardingSnapshot | null {
  const raw = localStorage.getItem(`allocate_ob_${uid}`)
  if (!raw) return null
  try {
    return JSON.parse(raw) as OnboardingSnapshot
  } catch {
    return null
  }
}

/**
 * Checks whether the user has completed onboarding and, if so, makes sure
 * their DB rows are actually linked to the profile. Accounts that completed
 * onboarding before the tables existed can have a profile (or localStorage
 * snapshot) that says "completed" while `paychecks` / `budgets` /
 * `allocations` are empty. This seeds the missing rows from
 * `profiles.paycheck_amount` and friends so the dashboard has data on login.
 *
 * Returns true when onboarding is complete (caller can route to /home).
 */
export default async function ensureUserData(uid: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed, pay_frequency, paycheck_amount, buckets, weekly_budget')
    .eq('id', uid)
    .single()

  const snapshot = readLocalSnapshot(uid)
  let completed = profile?.onboarding_completed === true || snapshot?.onboarding_completed === true

  // Catch-all: an existing account that already has data but whose
  // onboarding_completed flag is missing or false (interrupted final write,
  // a profile row that predates the column, or localStorage cleared on a new
  // browser) should NOT be sent back through onboarding. If the user already
  // has allocations or paychecks, treat them as onboarded and repair the flag.
  if (!completed) {
    const [{ count: allocCount }, { count: payCount }] = await Promise.all([
      supabase.from('allocations').select('id', { count: 'exact', head: true }).eq('user_id', uid),
      supabase.from('paychecks').select('id', { count: 'exact', head: true }).eq('user_id', uid),
    ])
    if ((allocCount ?? 0) > 0 || (payCount ?? 0) > 0) {
      completed = true
      await supabase.from('profiles').upsert({ id: uid, onboarding_completed: true }, { onConflict: 'id' })
    }
  }

  if (!completed) return false

  // Backfill the profiles row from the localStorage snapshot if it's missing,
  // so the next login resolves from the DB alone (e.g. on a new device).
  if (!profile && snapshot) {
    const res = await supabase
      .from('profiles')
      .upsert({ ...snapshot, id: uid, onboarding_completed: true }, { onConflict: 'id' })
    if (res.error) console.error('[onboarding] profiles backfill:', res.error)
  }

  // Merge per-field: the profiles row can exist but be partially empty (e.g.
  // created by an early auto-save), so fall back to the snapshot field by field.
  const paycheckAmount = profile?.paycheck_amount || snapshot?.paycheck_amount || 0
  const payFrequency = profile?.pay_frequency ?? snapshot?.pay_frequency ?? 'biweekly'
  const weeklyBudget = profile?.weekly_budget || snapshot?.weekly_budget || 0
  const buckets: Bucket[] = (profile?.buckets?.length ? profile.buckets : snapshot?.buckets) ?? []

  // Link paychecks to the profile: if the user has no paycheck rows but the
  // profile knows their paycheck amount, seed the initial paycheck.
  const { count: paycheckCount, error: paycheckCountErr } = await supabase
    .from('paychecks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', uid)
  if (paycheckCountErr) console.error('[onboarding] paychecks count:', paycheckCountErr)

  if ((paycheckCount ?? 0) === 0 && paycheckAmount > 0) {
    const ins = await supabase
      .from('paychecks')
      .insert({ user_id: uid, amount: paycheckAmount, note: 'Initial paycheck' })
    if (ins.error) console.error('[onboarding] paychecks backfill:', ins.error)
  }

  // Reverse linkage: if the profile lost its paycheck amount but real
  // paycheck rows exist, repair the profile from the latest paycheck.
  if ((paycheckCount ?? 0) > 0 && paycheckAmount === 0) {
    const { data: latest } = await supabase
      .from('paychecks')
      .select('amount')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (latest && latest.amount > 0) {
      const upd = await supabase
        .from('profiles')
        .upsert({ id: uid, paycheck_amount: latest.amount, onboarding_completed: true }, { onConflict: 'id' })
      if (upd.error) console.error('[onboarding] profile paycheck repair:', upd.error)
    }
  }

  // Same linkage for budgets…
  const { data: budget } = await supabase
    .from('budgets')
    .select('id')
    .eq('user_id', uid)
    .maybeSingle()

  if (!budget) {
    const ins = await supabase
      .from('budgets')
      .insert({ user_id: uid, pay_frequency: payFrequency, weekly_budget: weeklyBudget })
    if (ins.error) console.error('[onboarding] budgets backfill:', ins.error)
  }

  // …and allocations.
  const { count: allocCount } = await supabase
    .from('allocations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', uid)

  if ((allocCount ?? 0) === 0 && buckets.length > 0) {
    const ins = await supabase.from('allocations').insert(
      buckets.map(function (b) {
        return { user_id: uid, label: b.name, percentage: b.percent }
      })
    )
    if (ins.error) console.error('[onboarding] allocations backfill:', ins.error)
  }

  return true
}
