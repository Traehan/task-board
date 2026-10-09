// Every call to Supabase lives in this file. Each function throws on failure,
// so callers only need one try/catch.
import { supabase } from './supabase'
import type { Activity, BoardData, Comment, Task } from './types'

type Table = 'tasks' | 'team_members' | 'labels' | 'task_assignees' | 'task_labels' | 'comments'
type Result<T> = PromiseLike<{ data: T | null; error: { message: string } | null }>

async function run<T>(query: Result<T>): Promise<T> {
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as T
}

export const insert = (table: Table, rows: object | object[]) => run(supabase.from(table).insert(rows))
export const update = (table: Table, id: string, patch: object) => run(supabase.from(table).update(patch).eq('id', id))
export const remove = (table: Table, match: Record<string, string>) => run(supabase.from(table).delete().match(match))

/** Loads the whole board in three parallel requests. */
export async function fetchBoard(): Promise<BoardData> {
  const [tasks, members, labels] = await Promise.all([
    run<any[]>(
      supabase
        .from('tasks')
        .select('*, task_assignees(member_id), task_labels(label_id), comments(count)')
        .order('position'),
    ),
    run<any[]>(supabase.from('team_members').select('id, name, color').order('created_at')),
    run<any[]>(supabase.from('labels').select('id, name, color').order('created_at')),
  ])
  return { tasks: tasks.map(toTask), members, labels }
}

/** Comments and history are only loaded when a task is opened. */
export async function fetchTaskDetail(taskId: string): Promise<{ comments: Comment[]; activity: Activity[] }> {
  const [comments, activity] = await Promise.all([
    run<Comment[]>(supabase.from('comments').select('id, body, created_at').eq('task_id', taskId).order('created_at')),
    run<Activity[]>(
      supabase
        .from('activity')
        .select('id, type, meta, created_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false }),
    ),
  ])
  return { comments, activity }
}

/** Database row (with nested link rows) -> the flat Task the UI uses. */
function toTask({ task_assignees, task_labels, comments, user_id: _owner, ...row }: any): Task {
  return {
    ...row,
    assigneeIds: task_assignees.map((link: { member_id: string }) => link.member_id),
    labelIds: task_labels.map((link: { label_id: string }) => link.label_id),
    commentCount: comments[0]?.count ?? 0,
  }
}

/** Task -> the columns that live on the tasks table. */
export function toRow({ assigneeIds: _a, labelIds: _l, commentCount: _c, ...row }: Task) {
  return row
}
