import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { PayFrequency, Paycheck, Allocation, Goal, GoalContribution } from '@/types'
import Sidebar from '@/components/Sidebar'
import PayFrequencyCard from '@/components/PayFrequencyCard'
import LogPaycheckCard from '@/components/LogPaycheckCard'
import IncomeThisYearCard from '@/components/IncomeThisYearCard'
import WeeklyBudgetCard from '@/components/WeeklyBudgetCard'
import RolloverStartCard from '@/components/RolloverStartCard'
import GoalsCard from '@/components/GoalsCard'
import AllocationEditor from '@/components/AllocationEditor'
import ProjectedFundsCard from '@/components/ProjectedFundsCard'
import { supabase } from '@/lib/supabase'

type PaycheckData = {
  payFrequency: PayFrequency
  weeklyBudget: number
  rolloverStart: string | null
  projectionStart: string | null
  projectionEnd: string | null
  paychecks: Paycheck[]
  allocations: Allocation[]
  goals: Goal[]
  goalContributions: GoalContribution[]
}

async function fetchPaycheckData(): Promise<PaycheckData> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const [budgetRes, profileRes, paychecksRes, allocationsRes, goalsRes, goalContribsRes] = await Promise.all([
    supabase.from('budgets').select('pay_frequency, weekly_budget').eq('user_id', user.id).single(),
    supabase.from('profiles').select('pay_frequency, weekly_budget, rollover_start, projection_start, projection_end').eq('id', user.id).single(),
    supabase.from('paychecks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('allocations').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
    supabase.from('goals').select('*').eq('user_id', user.id).order('target_date', { ascending: true }),
    supabase.from('goal_contributions').select('*').eq('user_id', user.id),
  ])

  return {
    payFrequency: (budgetRes.data?.pay_frequency ?? profileRes.data?.pay_frequency ?? 'biweekly') as PayFrequency,
    weeklyBudget: budgetRes.data?.weekly_budget ?? profileRes.data?.weekly_budget ?? 0,
    rolloverStart: profileRes.data?.rollover_start ?? null,
    projectionStart: profileRes.data?.projection_start ?? null,
    projectionEnd: profileRes.data?.projection_end ?? null,
    paychecks: paychecksRes.data ?? [],
    allocations: allocationsRes.data ?? [],
    goals: goalsRes.data ?? [],
    goalContributions: goalContribsRes.data ?? [],
  }
}

export default function Paycheck() {
  const navigate = useNavigate()

  useEffect(function () {
    async function checkAuth() {
      const { data } = await supabase.auth.getUser()
      if (!data.user) navigate('/login')
    }
    checkAuth()
  }, [navigate])

  const { data } = useQuery({
    queryKey: ['paycheck'],
    queryFn: fetchPaycheckData,
    staleTime: 5 * 60 * 1000,
  })

  const payFrequency = data?.payFrequency ?? 'biweekly'
  const weeklyBudget = data?.weeklyBudget ?? 0
  const rolloverStart = data?.rolloverStart ?? null
  const projectionStart = data?.projectionStart ?? null
  const projectionEnd = data?.projectionEnd ?? null
  const goals = data?.goals ?? []
  const goalContributions = data?.goalContributions ?? []
  const paychecks = data?.paychecks ?? []
  const allocations = data?.allocations ?? []
  const latestPaycheck = paychecks[0]?.amount ?? 0

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-[#06101f]'>
      <Sidebar />

      <main className='ml-56 px-8 py-8'>
        <div className='mx-auto max-w-7xl'>

          <div className='mb-6'>
            <h1 className='text-xl font-bold text-gray-900 dark:text-slate-100'>Paycheck</h1>
            <p className='text-sm text-gray-500 dark:text-slate-400'>Set your pay frequency, log income, and allocate your earnings.</p>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 items-start'>

            {/* Column 1 — Income */}
            <div className='space-y-5'>
              <p className='text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500'>Income</p>
              <PayFrequencyCard
                payFrequency={payFrequency}
                latestPaycheck={latestPaycheck}
                allocations={allocations}
              />
              <LogPaycheckCard paychecks={paychecks} />
              <IncomeThisYearCard paychecks={paychecks} />
            </div>

            {/* Column 2 — Allocation */}
            <div className='space-y-5'>
              <p className='text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500'>Allocation</p>
              <AllocationEditor
                allocations={allocations}
                latestPaycheck={latestPaycheck}
                payFrequency={payFrequency}
              />
              <ProjectedFundsCard
                allocations={allocations}
                paychecks={paychecks}
                payFrequency={payFrequency}
                projectionStart={projectionStart}
                projectionEnd={projectionEnd}
              />
            </div>

            {/* Column 3 — Budget */}
            <div className='space-y-5'>
              <p className='text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500'>Budget</p>
              <WeeklyBudgetCard
                weeklyBudget={weeklyBudget}
                latestPaycheck={latestPaycheck}
                payFrequency={payFrequency}
                allocations={allocations}
              />
              <RolloverStartCard rolloverStart={rolloverStart} />
              <GoalsCard
                goals={goals}
                contributions={goalContributions}
                allocations={allocations}
                latestPaycheck={latestPaycheck}
                payFrequency={payFrequency}
              />
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
