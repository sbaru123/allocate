import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Category, Expense } from '@/types'
import { supabase } from '@/lib/supabase'

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'food',          label: 'Food & Dining' },
  { value: 'transport',     label: 'Transport' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'housing',       label: 'Housing' },
  { value: 'other',         label: 'Other' },
]

function localDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

type Props = {
  open: boolean
  onClose: () => void
  expense?: Expense | null
}

export default function ExpenseModal({ open, onClose, expense }: Props) {
  const queryClient = useQueryClient()
  const isEdit = !!expense

  const [amount, setAmount] = useState(expense ? String(expense.amount) : '')
  const [category, setCategory] = useState<Category>(expense?.category ?? 'food')
  const [note, setNote] = useState(expense?.note ?? '')
  const [date, setDate] = useState(
    expense ? localDateStr(new Date(expense.created_at)) : localDateStr(new Date())
  )

  const addMutation = useMutation({
    mutationFn: async function (vars: { amount: number; category: Category; note: string; date: string }) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('expenses').insert({
        user_id: user.id,
        amount: vars.amount,
        category: vars.category,
        note: vars.note,
        created_at: new Date(vars.date + 'T12:00:00').toISOString(),
      })
      if (error) throw error
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['history'] })
      onClose()
    },
  })

  const editMutation = useMutation({
    mutationFn: async function (vars: { id: string; amount: number; category: Category; note: string; date: string }) {
      const { error } = await supabase.from('expenses').update({
        amount: vars.amount,
        category: vars.category,
        note: vars.note,
        created_at: new Date(vars.date + 'T12:00:00').toISOString(),
      }).eq('id', vars.id)
      if (error) throw error
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['history'] })
      onClose()
    },
  })

  const isPending = addMutation.isPending || editMutation.isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const vars = { amount: parseFloat(amount), category, note, date }
    if (isEdit && expense) {
      editMutation.mutate({ id: expense.id, ...vars })
    } else {
      addMutation.mutate(vars)
    }
  }

  if (!open) return null

  return (
    <div
      className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'
      onClick={onClose}
    >
      <div
        className='bg-white dark:bg-[#0e1f38] w-full max-w-md rounded-2xl p-6'
        onClick={function (e) { e.stopPropagation() }}
      >
        <h2 className='text-lg font-bold text-gray-900 dark:text-slate-100 mb-4 text-center'>
          {isEdit ? 'Edit expense' : 'Log an expense'}
        </h2>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1'>Amount ($)</label>
            <input
              type='number'
              step='0.01'
              min='0'
              required
              autoFocus
              value={amount}
              onChange={function (e) { setAmount(e.target.value) }}
              className='w-full border border-gray-200 dark:border-[#1e3354] bg-white dark:bg-[#0a1628] text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 placeholder:text-gray-400 dark:placeholder:text-slate-600'
              placeholder='0.00'
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1'>Category</label>
            <div className='grid grid-cols-3 gap-2'>
              {CATEGORIES.map(function (cat) {
                return (
                  <button
                    key={cat.value}
                    type='button'
                    onClick={function () { setCategory(cat.value) }}
                    className={`py-1.5 rounded-lg text-xs font-medium border transition-[transform,background-color,border-color,color] duration-150 active:scale-[0.97] ${
                      category === cat.value
                        ? 'border-sky-400 bg-sky-50 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300'
                        : 'border-gray-200 dark:border-[#1e3354] text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-[#152238]'
                    }`}
                  >
                    {cat.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1'>Note (optional)</label>
            <input
              type='text'
              value={note}
              onChange={function (e) { setNote(e.target.value) }}
              className='w-full border border-gray-200 dark:border-[#1e3354] bg-white dark:bg-[#0a1628] text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 placeholder:text-gray-400 dark:placeholder:text-slate-600'
              placeholder='e.g. Chipotle, Metro card...'
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1'>Date</label>
            <input
              type='date'
              required
              value={date}
              max={localDateStr(new Date())}
              onChange={function (e) { setDate(e.target.value) }}
              className='w-full border border-gray-200 dark:border-[#1e3354] bg-white dark:bg-[#0a1628] text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400'
            />
          </div>
          <div className='flex gap-2 pt-1'>
            <button
              type='button'
              onClick={onClose}
              className='flex-1 border border-gray-300 dark:border-[#1e3354] text-gray-600 dark:text-slate-300 py-2 rounded-lg text-sm font-medium transition-[transform,background-color] duration-150 hover:bg-gray-50 dark:hover:bg-[#152238] active:scale-[0.97]'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={isPending}
              className='flex-1 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition-[transform,background-color] duration-150 active:scale-[0.97]'
            >
              {isPending
                ? (isEdit ? 'Saving...' : 'Adding...')
                : (isEdit ? 'Save changes' : 'Add expense')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
