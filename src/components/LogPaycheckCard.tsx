import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Paycheck } from '@/types'
import { supabase } from '@/lib/supabase'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function maxDateStr() {
  return todayStr()
}

type Props = {
  paychecks: Paycheck[]
}

export default function LogPaycheckCard({ paychecks }: Props) {
  const queryClient = useQueryClient()

  // Add form
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayStr)

  // Edit modal
  const [editingPaycheck, setEditingPaycheck] = useState<Paycheck | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editDate, setEditDate] = useState('')

  const totalIncome = paychecks.reduce(function (s, p) { return s + p.amount }, 0)

  const addPaycheckMutation = useMutation({
    mutationFn: async function (vars: { amount: number; note: string; date: string }) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('paychecks').insert({
        user_id: user.id,
        amount: vars.amount,
        note: vars.note,
        created_at: new Date(vars.date + 'T12:00:00').toISOString(),
      })
      if (error) throw error
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ['paycheck'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setAmount('')
      setNote('')
      setDate(todayStr())
    },
  })

  const deletePaycheckMutation = useMutation({
    mutationFn: async function (id: string) {
      await supabase.from('paychecks').delete().eq('id', id)
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ['paycheck'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const updatePaycheckMutation = useMutation({
    mutationFn: async function (vars: { id: string; amount: number; note: string; date: string }) {
      const { error } = await supabase.from('paychecks').update({
        amount: vars.amount,
        note: vars.note,
        created_at: new Date(vars.date + 'T12:00:00').toISOString(),
      }).eq('id', vars.id)
      if (error) throw error
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ['paycheck'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setEditingPaycheck(null)
    },
  })

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    addPaycheckMutation.mutate({ amount: parseFloat(amount), note, date })
  }

  function startEdit(p: Paycheck) {
    setEditingPaycheck(p)
    setEditAmount(String(p.amount))
    setEditNote(p.note ?? '')
    const d = new Date(p.created_at)
    setEditDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingPaycheck) return
    updatePaycheckMutation.mutate({
      id: editingPaycheck.id,
      amount: parseFloat(editAmount),
      note: editNote,
      date: editDate,
    })
  }

  return (
    <>
      <div className='bg-white rounded-2xl border border-gray-200 p-5 shadow-sm'>
        <div className='flex justify-between items-baseline mb-3'>
          <h2 className='text-sm font-semibold text-gray-800'>Log a paycheck</h2>
          <span className='text-xs text-gray-400'>Total logged: ${totalIncome.toFixed(2)}</span>
        </div>
        <form onSubmit={handleAdd} className='space-y-3'>
          <div className='flex gap-2'>
            <input
              type='text'
              value={note}
              onChange={function (e) { setNote(e.target.value) }}
              className='flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400'
              placeholder='Note (e.g. Week 1)'
            />
            <input
              type='number'
              step='1'
              min='0'
              required
              value={amount}
              onChange={function (e) { setAmount(e.target.value) }}
              className='flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400'
              placeholder='Amount ($)'
            />
          </div>
          <input
            type='date'
            required
            value={date}
            max={maxDateStr()}
            onChange={function (e) { setDate(e.target.value) }}
            className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400'
          />
          <button
            type='submit'
            disabled={addPaycheckMutation.isPending}
            className='w-full bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition-colors'
          >
            {addPaycheckMutation.isPending ? 'Adding...' : 'Add paycheck'}
          </button>
        </form>

        {paychecks.length > 0 && (
          <div className='mt-4 divide-y divide-gray-100'>
            {paychecks.map(function (p) {
              return (
                <div
                  key={p.id}
                  onClick={function () { startEdit(p) }}
                  className='flex items-center py-2 gap-3 cursor-pointer rounded-lg hover:bg-gray-100 -mx-2 px-2 transition-colors group'
                >
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm text-gray-800 group-hover:underline'>${p.amount.toFixed(2)}</p>
                    <p className='text-xs text-gray-400'>
                      {p.note && `${p.note} · `}
                      {new Date(p.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={function (e) { e.stopPropagation(); deletePaycheckMutation.mutate(p.id) }}
                    className='text-gray-300 hover:text-red-400 text-xs transition-colors'
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingPaycheck && (
        <div
          className='fixed inset-0 bg-black/40 flex items-center justify-center z-50'
          onClick={function () { setEditingPaycheck(null) }}
        >
          <div
            className='bg-white w-full max-w-md rounded-2xl p-6'
            onClick={function (e) { e.stopPropagation() }}
          >
            <h2 className='text-lg font-bold text-gray-900 mb-4 text-center'>Edit paycheck</h2>
            <form onSubmit={handleSaveEdit} className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Amount ($)</label>
                <input
                  type='number'
                  step='0.01'
                  min='0'
                  required
                  autoFocus
                  value={editAmount}
                  onChange={function (e) { setEditAmount(e.target.value) }}
                  className='w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Note (optional)</label>
                <input
                  type='text'
                  value={editNote}
                  onChange={function (e) { setEditNote(e.target.value) }}
                  className='w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400'
                  placeholder='e.g. Week 1'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Date received</label>
                <input
                  type='date'
                  required
                  value={editDate}
                  max={maxDateStr()}
                  onChange={function (e) { setEditDate(e.target.value) }}
                  className='w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400'
                />
              </div>
              <div className='flex gap-2 pt-1'>
                <button
                  type='button'
                  onClick={function () { setEditingPaycheck(null) }}
                  className='flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={updatePaycheckMutation.isPending}
                  className='flex-1 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition-colors'
                >
                  {updatePaycheckMutation.isPending ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
