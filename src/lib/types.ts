// The shapes of the data the app works with. These mirror the Supabase tables.

export type Status = 'todo' | 'in_progress' | 'in_review' | 'done'
export type Priority = 'low' | 'normal' | 'high'

export interface Task {
  id: string
  title: string
  description: string
  status: Status
  priority: Priority
  due_date: string | null // 'YYYY-MM-DD'
  position: number // sort order inside a column, smaller is higher
  created_at: string
  assigneeIds: string[]
  labelIds: string[]
  commentCount: number
}

/** Team members and labels share a shape: something with a name and a color. */
export interface Tag {
  id: string
  name: string
  color: string
}

export interface Comment {
  id: string
  body: string
  created_at: string
}

export interface Activity {
  id: string
  type: string
  meta: Record<string, string | null>
  created_at: string
}

export interface BoardData {
  tasks: Task[]
  members: Tag[]
  labels: Tag[]
}

export interface Filters {
  search: string
  priority: Priority | ''
  memberId: string
  labelId: string
}

export const NO_FILTERS: Filters = { search: '', priority: '', memberId: '', labelId: '' }

export const COLUMNS: { id: Status; title: string }[] = [
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'in_review', title: 'In Review' },
  { id: 'done', title: 'Done' },
]

export const STATUS_TITLE = Object.fromEntries(COLUMNS.map((c) => [c.id, c.title])) as Record<Status, string>

export const PRIORITIES: { id: Priority; title: string }[] = [
  { id: 'low', title: 'Low' },
  { id: 'normal', title: 'Normal' },
  { id: 'high', title: 'High' },
]

export const PALETTE = ['#2F5BEA', '#18A06A', '#E08A00', '#7B5CF0', '#D6364A', '#0E9AA7', '#C2478F', '#5B6478']
