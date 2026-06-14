# Allocate

A personal finance OS built for college students and interns. Not just a tracker — a tool for intentional money management.

## What It Does

Terp Budget lets you split every paycheck across custom buckets (Checking, Savings, Roth IRA, Emergency Fund, etc.) based on rules you define. Set goals, track spending by category, and get AI-powered guidance on your financial decisions.

## Features

- **Paycheck splitting** — define percentage or fixed allocations per bucket, auto-distribute on every paycheck
- **Bucket system** — organize money across checking, savings, investment, and custom accounts
- **Expense tracking** — log daily expenses by category against your weekly budget
- **Goal planning** — set a target amount and date, track required contributions per paycheck
- **AI assistant** — ask questions about your finances, get proactive spending alerts, and learn financial concepts *(coming soon)*

## Tech Stack

- **Frontend:** React + TypeScript + Tailwind CSS + React Router
- **Backend:** Supabase (Postgres, Auth, Storage)
- **Charts:** Recharts
- **AI:** Anthropic API (Claude)
- **Hosting:** Vercel

## Database Schema

| Table | Description |
|---|---|
| `budgets` | Weekly spending limits per user |
| `expenses` | Individual expense entries with category and note |
| `paychecks` | Income entries with amount and note |
| `buckets` | User-defined money buckets with allocation rules |
| `paycheck_allocations` | Records how each paycheck was split across buckets |

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase account

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/terp-budget.git
cd terp-budget
npm install
```

### Environment Variables

Create a `.env.local` file in the root of the project:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key
```

### Run Locally

```bash
npm run dev
```

App runs at `http://localhost:5173`.

## Pages

| Route | Description |
|---|---|
| `/` | Dashboard — weekly spend, bucket balances, recent expenses |
| `/history` | Full expense history with category filtering |
| `/paycheck` | Log paychecks and manage bucket allocation rules |
| `/settings` | Weekly budget and account preferences |

## Roadmap

- [ ] Goal planning with per-paycheck contribution tracking
- [ ] AI financial assistant with full account context
- [ ] Recurring transactions engine
- [ ] Plaid integration for automatic transaction import
- [ ] Mobile responsive polish
