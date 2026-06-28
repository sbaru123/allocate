---
name: allocate-page-builder
description: Use this skill whenever the user pastes a large UI design spec, mockup description, or screen layout — especially prompts that came from Claude Design — and wants it built as a page or component in the Allocate app. Also trigger when the user says "build this page", "implement this screen", "code this up", or describes a new screen for Allocate. This skill ensures every page correctly follows Allocate's design system, shared components, code style rules, and file conventions. Always use this skill rather than guessing at conventions.
---

# Allocate Page Builder

You're building UI for **Allocate** — a personal finance app for college students and interns. Design specs usually arrive as a large structured prompt from Claude Design, but can also be a written description or mockup image from the user.

---

## Code Style Rules (non-negotiable, from CLAUDE.md)

- **Single quotes** everywhere — `'like this'`, never `"like this"`
- **@ imports** — always `@/components/...` or `@/pages/...`, never `./` or `../`
- **No arrow functions** — use named `function` declarations throughout, including event handlers and callbacks
- **export default** — every file must use `export default function ComponentName()`

---

## Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4 — use utility classes directly, no config file needed
- React Router v7 — `useNavigate`, `Link` from `react-router-dom`
- Supabase auth — `import { supabase } from '@/lib/supabase'`
- TanStack Query v5 — for any data fetching with query keys

---

## Design System

### Colors
| Use | Value |
|---|---|
| Headings / primary text | `rgb(15,38,68)` |
| Muted / secondary text | `rgba(15,38,68,0.55)` – `rgba(15,38,68,0.65)` |
| Primary accent | `sky-600` / `#0284c7` |
| Page background gradient | `linear-gradient(165deg, #fbfdff, #eef5fd 48%, #e6f1fc)` |
| Card background | `rgba(255,255,255,0.82)` + `backdrop-blur-xl` |
| Card border | `border-white/60` |

### Typography
- Headings: `font-bold tracking-tight` with navy color inline
- Body: `text-sm` or `text-base leading-relaxed`
- Labels / badges: `text-xs font-semibold uppercase tracking-wide`

### Component Patterns
- **Cards:** `rounded-3xl border border-white/60 shadow-2xl` with glassy bg
- **Primary button:** `rounded-full bg-sky-600 text-white hover:bg-sky-700 font-semibold transition-all hover:scale-[1.03] active:scale-[0.97]`
- **Secondary button:** `rounded-full border font-semibold` with `rgba(255,255,255,0.75)` bg
- **Text inputs:** `w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500`
- **Pill toggles / selectors:** `rounded-full px-4 py-1.5 text-sm font-semibold border` — selected state uses `bg-sky-600 text-white border-sky-600`
- **Badges:** `rounded-full px-4 py-1.5 text-xs font-semibold border` with glassy bg
- **Step indicators:** small dots or `Step X of Y` text at top of onboarding screens

---

## Shared Components

These already exist — always import and reuse rather than recreating:

```tsx
import HeroBackground from '@/components/landing/HeroBackground'
import Logo from '@/components/landing/Logo'
import AllocationCard from '@/components/landing/AllocationCard'
import ProjectionCard from '@/components/landing/ProjectionCard'
import SafeToSpendCard from '@/components/landing/SafeToSpendCard'
import SavedTickerCard from '@/components/landing/SavedTickerCard'
```

- **`HeroBackground`** — `absolute inset-0` gradient + three drifting blobs. Drop it as the first child of any marketing/auth page wrapper.
- **`Logo`** — sky-600 bullseye chip + "Allocate" wordmark, wrapped in `<Link to='/'>`. Use in navbars.
- **Landing cards** — animated product preview cards used on the landing and login pages.

---

## Page Shell Patterns

### Marketing / Auth pages (landing, login, signup, onboarding)
```tsx
return (
  <div className='relative min-h-screen overflow-hidden'>
    <HeroBackground />
    <nav className='relative z-10 flex items-center px-8 py-5'>
      <Logo />
    </nav>
    <div className='relative z-10 flex items-center justify-center min-h-[calc(100vh-72px)] px-6 py-10'>
      <div className='w-full max-w-md'>
        {/* centered card content */}
      </div>
    </div>
  </div>
)
```

### Multi-step onboarding pages
Wrap content in a centered glassy card with a step indicator at the top, back/skip controls, and a Continue button pinned to the bottom of the card:
```tsx
<div className='w-full max-w-lg bg-white/82 backdrop-blur-xl rounded-3xl border border-white/60 shadow-2xl p-10'>
  {/* Step indicator */}
  <p className='text-xs font-semibold text-sky-600 mb-6'>Step {step} of {total}</p>
  {/* Content */}
  <button className='w-full mt-8 rounded-full bg-sky-600 text-white ...'>Continue</button>
</div>
```

### App / dashboard pages
Use `Sidebar` from `@/components/Sidebar`. The sidebar already handles navigation.

---

## CSS Animation Classes (defined in index.css)

- `.reveal-up` — fade + slide-up entrance; use `animationDelay` in `style` prop for stagger
- `.card-bob` — gentle infinite floating; wrap a card element in a div with this class
- `.card-reveal-tl / tr / bl / br` — corner-direction card entrance
- `.bar-shimmer` — shimmer sweep on segmented allocation bars

---

## Reading a Claude Design Prompt

Claude Design prompts typically contain:

- **Headline / subhead copy** — use the exact text verbatim
- **Field descriptions** — map each one to a controlled input with `useState`
- **Visual style notes** — translate to the Tailwind/CSS patterns above using Allocate's color tokens
- **Interaction notes** — implement with `useState` / `useNavigate`
- **Step/flow descriptions** — implement as a step index `const [step, setStep] = useState(1)` with conditional rendering per step

Build a **fully working page**, not a skeleton — include all states (loading, error, empty, filled, success). All form state should be `useState`. Async operations (Supabase calls) should use `async/await` inside named functions.

---

## After Building

Remind the user to:
1. Add the new route in `src/App.tsx`
2. Add a nav item in `src/components/Sidebar.tsx` if it's an app page
3. Delete any old placeholder file if this page replaces one
