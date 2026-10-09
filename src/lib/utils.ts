import type { Filters, Task } from './types'

const DAY = 86_400_000

/** 'YYYY-MM-DD' -> a Date at local midnight (new Date(string) would use UTC). */
function parseDay(day: string): Date {
  const [year, month, date] = day.split('-').map(Number)
  return new Date(year, month - 1, date)
}

function daysUntil(day: string): number {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((parseDay(day).getTime() - today.getTime()) / DAY)
}

export const formatDay = (day: string) => parseDay(day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export const formatTimestamp = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export type Urgency = 'overdue' | 'today' | 'soon' | 'later'

/** What the due badge on a card should say, and how urgent it is. */
export function dueInfo(task: Task): { urgency: Urgency; label: string } | null {
  if (!task.due_date) return null
  const days = daysUntil(task.due_date)
  if (task.status === 'done' || days > 3) return { urgency: 'later', label: formatDay(task.due_date) }
  if (days < 0) return { urgency: 'overdue', label: `${-days}d overdue` }
  if (days === 0) return { urgency: 'today', label: 'Due today' }
  return { urgency: 'soon', label: days === 1 ? 'Due tomorrow' : `Due in ${days} days` }
}

export const isOverdue = (task: Task) => dueInfo(task)?.urgency === 'overdue'

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

/** '2 hours ago', 'yesterday', ... */
export function timeAgo(iso: string): string {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  }
  return 'just now'
}

export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')

/**
 * A sort position that lands between two neighbours. Moving a card only
 * rewrites that one card, never the rest of the column.
 */
export function positionBetween(before?: number, after?: number): number {
  if (before !== undefined && after !== undefined) return (before + after) / 2
  if (before !== undefined) return before + 1
  if (after !== undefined) return after - 1
  return 0
}

export function matchesFilters(task: Task, filters: Filters): boolean {
  return (
    task.title.toLowerCase().includes(filters.search.trim().toLowerCase()) &&
    (!filters.priority || task.priority === filters.priority) &&
    (!filters.memberId || task.assigneeIds.includes(filters.memberId)) &&
    (!filters.labelId || task.labelIds.includes(filters.labelId))
  )
}

export const byPosition = (a: Task, b: Task) => a.position - b.position
