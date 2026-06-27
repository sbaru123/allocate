# Allocate

A personal finance OS built for college students and interns. Not just a tracker — a system for intentional money management that splits every paycheck into the goals that build real wealth.

## What It Does

Allocate takes your income and automatically distributes it across custom buckets (Investing, Savings, Lifestyle, Giving, etc.) based on percentage rules you define. Track spending by category, monitor projected fund growth, and see exactly where every dollar went.

## Features

- **Paycheck splitting** — define percentage-based allocation rules per bucket, auto-distribute on every paycheck entry
- **Bucket system** — organize money across investing, savings, lifestyle, and any custom category
- **Expense tracking** — log daily expenses by category against your weekly budget with a breakdown chart
- **Allocation editor** — adjust your split rules at any time and see the impact immediately
- **Projected funds** — visualize how your balances grow over time based on current allocation pace
- **Pay frequency tracking** — set weekly, bi-weekly, or monthly pay cadence
- **Dark mode** — full dark/light theme with system preference support
- **AI assistant** — ask questions about your finances and get proactive guidance *(coming soon)*

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4 + React Router v7
- **State / Data:** TanStack Query v5
- **Backend:** Supabase (Postgres, Auth, Row-Level Security)
- **Charts:** Recharts
- **AI:** Anthropic API (Claude) *(planned)*
- **Hosting:** Vercel *(planned)*

## Project Structure

```
src/
├── components/
│   ├── landing/          # Marketing page components (HeroBackground, Logo, cards)
│   ├── AllocationEditor.tsx
│   ├── ExpenseBreakdown.tsx
│   ├── ExpensePopup.tsx
│   ├── IncomeThisYearCard.tsx
│   ├── LogPaycheckCard.tsx
│   ├── PaycheckAllocation.tsx
│   ├── PayFrequencyCard.tsx
│   ├── ProjectedFundsCard.tsx
│   ├── RecentActivity.tsx
│   ├── SevenDayChart.tsx
│   └── Sidebar.tsx
├── pages/
│   ├── Home.tsx          # Marketing landing page
│   ├── Login.tsx         # Auth — email/password + Google OAuth
│   ├── Signup.tsx        # New account creation
│   ├── CheckEmail.tsx    # Post-signup confirmation prompt
│   ├── Dashboard.tsx     # Main app view
│   ├── History.tsx       # Full expense history with filtering
│   └── Paycheck.tsx      # Log paychecks + manage allocation rules
├── hooks/
│   └── useCountUp.ts     # rAF-based animated number counter
└── lib/
    └── supabase.ts       # Supabase client
```

## Database Schema

| Table | Description |
|---|---|
| `budgets` | Weekly spending limits per user |
| `expenses` | Individual expense entries with category and note |
| `paychecks` | Income entries with amount and date |
| `buckets` | User-defined money buckets with allocation rules |
| `paycheck_allocations` | Records how each paycheck was split across buckets |
| `allocations` | Recurring allocation rule definitions per user |

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase account

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/allocate.git
cd allocate
npm install
```

### Environment Variables

Create a `.env.local` file in the root:

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
| `/` | Marketing landing page with animated product preview |
| `/login` | Sign in with email/password or Google OAuth |
| `/signup` | Create a new account |
| `/check-email` | Email confirmation prompt after signup |
| `/dashboard` | Weekly spend, bucket balances, recent expenses, charts |
| `/history` | Full expense history with category filtering |
| `/paycheck` | Log a paycheck and manage allocation rules |

## Roadmap

- [ ] AI financial assistant with full account context (Claude integration)
- [ ] Plaid integration for automatic transaction import
- [ ] Goal planning with per-paycheck contribution tracking
- [ ] Recurring transactions engine
- [ ] Mobile responsive polish
- [ ] CI/CD pipeline (GitHub Actions)
