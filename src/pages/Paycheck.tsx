import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { PayFrequency, Paycheck, Allocation } from '@/types'
import Sidebar from '@/components/Sidebar'
import PayFrequencyCard from '@/components/PayFrequencyCard'
import LogPaycheckCard from '@/components/LogPaycheckCard'
import IncomeThisYearCard from '@/components/IncomeThisYearCard'
import AllocationEditor from '@/components/AllocationEditor'
import ProjectedFundsCard from '@/components/ProjectedFundsCard'
import { supabase } from '@/lib/supabase'

type PaycheckData = {
  payFrequency: PayFrequency
  paychecks: Paycheck[]
  allocations: Allocation[]
}

async function fetchPaycheckData(): Promise<PaycheckData> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const [budgetRes, paychecksRes, allocationsRes] = await Promise.all([
    supabase.from('budgets').select('pay_frequency').eq('user_id', user.id).single(),
    supabase.from('paychecks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('allocations').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
  ])

  return {
    payFrequency: (budgetRes.data?.pay_frequency as PayFrequency) ?? 'biweekly',
    paychecks: paychecksRes.data ?? [],
    allocations: allocationsRes.data ?? [],
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
  const paychecks = data?.paychecks ?? []
  const allocations = data?.allocations ?? []
  const latestPaycheck = paychecks[0]?.amount ?? 0

  return (
    <div className='min-h-screen bg-gray-50'>
      <Sidebar />

      <main className='ml-56 px-8 py-8'>
        <div className='mx-auto max-w-5xl'>

          <div className='mb-6'>
            <h1 className='text-xl font-bold text-gray-900'>Paycheck</h1>
            <p className='text-sm text-gray-500'>Set your pay frequency, log income, and allocate your earnings.</p>
          </div>

          <div className='grid grid-cols-2 gap-5 items-start'>

            {/* Left column */}
            <div className='space-y-5'>
              <PayFrequencyCard
                payFrequency={payFrequency}
                latestPaycheck={latestPaycheck}
                allocations={allocations}
              />
              <LogPaycheckCard paychecks={paychecks} />
              <IncomeThisYearCard paychecks={paychecks} />
            </div>

            {/* Right column */}
            <div className='space-y-5'>
              <AllocationEditor
                allocations={allocations}
                latestPaycheck={latestPaycheck}
              />
              <ProjectedFundsCard
                allocations={allocations}
                paychecks={paychecks}
                payFrequency={payFrequency}
              />
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
