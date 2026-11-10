import type { ReactNode } from 'react'

/*
 * Admin-only building blocks. Kept apart from components/ui.tsx, which pulls in the board store;
 * the admin page uses the same design tokens (index.css) without the board's code.
 */
export const btnPrimary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] bg-brand px-4 font-bold text-on-brand transition-[background-color] duration-200 hover:bg-brand-ink disabled:opacity-45'
export const btnAlt = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] border border-line-2 bg-surface px-4 font-bold text-ink transition-[background-color] duration-200 hover:bg-surface-2 disabled:opacity-45'
export const input = 'min-h-11 w-full rounded-[12px] border border-line-2 bg-surface px-3 text-[15px] focus:border-brand-ink focus:outline-none'

/** A page section: title, one-line purpose, the primary action on the right. */
export function Page({ title, sub, action, children }: { title: string; sub: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mx-auto grid w-full max-w-[1100px] gap-4 px-6 py-6 max-sm:px-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[24px] leading-tight">{title}</h1>
          <p className="mt-1 text-[14.5px] text-muted">{sub}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

/** A data table whose rows arrive in Task B.15; until then it shows why it's empty. */
export function Table({ cols, empty }: { cols: string[]; empty: string }) {
  return (
    <div className="overflow-x-auto rounded-[16px] border border-line bg-surface">
      <table className="w-full border-collapse text-[14.5px]">
        <thead>
          <tr>{cols.map(c => <th key={c} className="border-b border-line px-4 py-2.5 text-left text-[12.5px] font-bold text-muted">{c}</th>)}</tr>
        </thead>
        <tbody>
          <tr><td colSpan={cols.length} className="px-4 py-10 text-center text-muted">{empty}</td></tr>
        </tbody>
      </table>
    </div>
  )
}
