import { Link } from 'react-router-dom'
import type { Expense, Category } from '@/types'

const CATEGORIES: { value: Category; label: string; color: string }[] = [
  { value: 'food',          label: 'Food & Dining',  color: 'bg-orange-400' },
  { value: 'transport',     label: 'Transport',       color: 'bg-blue-400'   },
  { value: 'entertainment', label: 'Entertainment',   color: 'bg-purple-400' },
  { value: 'housing',       label: 'Housing',         color: 'bg-yellow-400' },
  { value: 'other',         label: 'Other',           color: 'bg-gray-400'   },
]

type Props = {
  expenses: Expense[]
  periodName: string
  onExpenseClick: (exp: Expense) => void
}

export default function RecentActivity({ expenses, periodName, onExpenseClick }: Props) {
  return (
    <div className='bg-white rounded-2xl border border-gray-200 p-5 shadow-sm'>
      <div className='flex justify-between items-center mb-3'>
        <p className='text-sm font-semibold text-gray-700'>Recent Activity</p>
        <Link to='/history' className='text-xs text-sky-600 hover:underline'>See all</Link>
      </div>

      {expenses.length === 0 ? (
        <p className='text-sm text-gray-400'>No expenses logged this {periodName} yet.</p>
      ) : (
        <div className='space-y-2.5'>
          {expenses.slice(0, 5).map(function (exp) {
            const cat = CATEGORIES.find(function (c) { return c.value === exp.category })
            return (
              <div
                key={exp.id}
                onClick={() => onExpenseClick(exp)}
                className='flex items-center gap-3 cursor-pointer rounded-xl hover:bg-gray-100 -mx-2 px-2 py-1.5 transition-colors group'
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cat?.color ?? 'bg-gray-300'}`} />
                <div className='flex-1 min-w-0'>
                  <p className='text-sm text-gray-800 truncate group-hover:underline'>{exp.note || cat?.label}</p>
                  <p className='text-xs text-gray-400'>
                    {cat?.label} · {new Date(exp.created_at).toLocaleDateString()}
                  </p>
                </div>
                <p className='text-sm font-semibold text-gray-900 group-hover:text-sky-600 transition-colors'>${exp.amount.toFixed(2)}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
