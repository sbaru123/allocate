export type Category = 'food' | 'transport' | 'entertainment' | 'housing' | 'other'

export type Expense = {
  id: string
  amount: number
  category: Category
  note: string
  created_at: string
}

export type Allocation = {
  id: string
  label: string
  percentage: number
}

export type PayFrequency = 'weekly' | 'biweekly' | 'monthly'

export type Paycheck = {
  id: string
  amount: number
  note: string
  created_at: string
}
