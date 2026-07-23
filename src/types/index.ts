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
  // Coverage window: which weeks this paycheck's budget applies to.
  period_start?: string | null
  period_weeks?: number | null
}

export type Goal = {
  id: string
  name: string
  target_amount: number
  target_date: string
  allocation_pct: number
  created_at: string
}

export type GoalContribution = {
  id: string
  goal_id: string
  amount: number
  note: string
  created_at: string
}
