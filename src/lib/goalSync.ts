import { supabase } from '@/lib/supabase'

export const ALLOCATION_CONTRIB_NOTE = 'Allocated from latest paycheck'

/**
 * Credits every percentage-linked goal from a logged paycheck by inserting
 * contribution rows tied to the paycheck (paycheck_id cascades on delete).
 */
export async function creditGoalsFromPaycheck(uid: string, paycheckId: string, amount: number) {
  const { data: goalRows, error } = await supabase
    .from('goals')
    .select('id, allocation_pct')
    .eq('user_id', uid)
    .gt('allocation_pct', 0)
  if (error) {
    console.error('[goalSync] goals fetch:', error)
    return
  }
  const rows = (goalRows ?? []).map(function (g) {
    return {
      goal_id: g.id,
      user_id: uid,
      paycheck_id: paycheckId,
      amount: Math.round(amount * g.allocation_pct) / 100,
      note: ALLOCATION_CONTRIB_NOTE,
    }
  })
  if (rows.length === 0) return
  const ins = await supabase.from('goal_contributions').insert(rows)
  if (ins.error) console.error('[goalSync] paycheck credit:', ins.error)
}

/**
 * Re-credits goals after a paycheck edit: wipes the credits tied to that
 * paycheck and recreates them from the new amount at current goal %s.
 */
export async function recreditGoalsForPaycheck(uid: string, paycheckId: string, amount: number) {
  const del = await supabase.from('goal_contributions').delete().eq('paycheck_id', paycheckId)
  if (del.error) {
    console.error('[goalSync] paycheck recredit cleanup:', del.error)
    return
  }
  await creditGoalsFromPaycheck(uid, paycheckId, amount)
}

/**
 * Rebuilds a single goal's auto (paycheck-driven) contributions so there is
 * exactly one row per paycheck at the current percentage. Wipes all prior
 * auto rows first (including legacy untied ones), leaving manual
 * contributions untouched. Use whenever a goal's percentage is set/changed.
 */
export async function setGoalPaycheckContributions(uid: string, goalId: string, pct: number) {
  const del = await supabase
    .from('goal_contributions')
    .delete()
    .eq('goal_id', goalId)
    .eq('note', ALLOCATION_CONTRIB_NOTE)
  if (del.error) {
    console.error('[goalSync] goal contrib reset:', del.error)
    return
  }
  if (pct <= 0) return

  const { data: pays, error } = await supabase
    .from('paychecks')
    .select('id, amount')
    .eq('user_id', uid)
  if (error) {
    console.error('[goalSync] paychecks fetch:', error)
    return
  }
  const rows = (pays ?? []).map(function (p) {
    return {
      goal_id: goalId,
      user_id: uid,
      paycheck_id: p.id,
      amount: Math.round(p.amount * pct) / 100,
      note: ALLOCATION_CONTRIB_NOTE,
    }
  })
  if (rows.length === 0) return
  const ins = await supabase.from('goal_contributions').insert(rows)
  if (ins.error) console.error('[goalSync] goal contrib rebuild:', ins.error)
}

/**
 * Keeps a goal in sync when its mirrored allocation bucket changes.
 * Finds the goal whose name matches the bucket label (case-insensitive) and
 * sets its paycheck percentage. Setting 0 (bucket deleted or renamed away)
 * also removes the auto-credited paycheck contributions, so only the
 * allocation-driven amount leaves the goal — manual contributions stay.
 */
export default async function syncGoalWithAllocationLabel(uid: string, label: string, pct: number) {
  const { data: goalRows, error } = await supabase
    .from('goals')
    .select('id, name, allocation_pct')
    .eq('user_id', uid)
  if (error) {
    console.error('[goalSync] goals fetch:', error)
    return
  }

  const linked = (goalRows ?? []).find(function (g) {
    return g.name.trim().toLowerCase() === label.trim().toLowerCase()
  })
  if (!linked || linked.allocation_pct === pct) return

  const upd = await supabase.from('goals').update({ allocation_pct: pct }).eq('id', linked.id)
  if (upd.error) {
    console.error('[goalSync] goal update:', upd.error)
    return
  }

  // Rebuild the goal's paycheck-driven contributions at the new percentage
  // (pct === 0 clears them; manual contributions are left intact).
  await setGoalPaycheckContributions(uid, linked.id, pct)
}
