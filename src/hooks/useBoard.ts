// All board state and every action that changes it. Components never talk to
// Supabase directly; they call the functions returned here.
import { useCallback, useEffect, useState } from 'react'
import * as api from '../lib/api'
import { buildSamples } from '../lib/sample'
import { ensureGuestSession } from '../lib/supabase'
import type { BoardData, Status, Task } from '../lib/types'
import { positionBetween } from '../lib/utils'

export type TaskPatch = Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'due_date' | 'position'>>
export type NewTask = Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'due_date' | 'assigneeIds' | 'labelIds'>
export type TagKind = 'members' | 'labels'
export type Board = ReturnType<typeof useBoard>

const TAG_TABLE = { members: 'team_members', labels: 'labels' } as const
const LINK = {
  assigneeIds: { table: 'task_assignees', column: 'member_id' },
  labelIds: { table: 'task_labels', column: 'label_id' },
} as const

export function useBoard() {
  const [data, setData] = useState<BoardData>({ tasks: [], members: [], labels: [] })
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  // Goes up by one after every successful save. The task panel watches it to
  // know when to reload a task's history.
  const [revision, setRevision] = useState(0)

  const load = useCallback(async () => {
    try {
      await ensureGuestSession()
      setData(await api.fetchBoard())
      setPhase('ready')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.')
      setPhase('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const dismissNotice = useCallback(() => setNotice(null), [])

  const retry = () => {
    setPhase('loading')
    load()
  }

  /**
   * Optimistic update: change the screen first, then save. If the save fails,
   * show a message and reload the board so the screen matches the database.
   */
  async function mutate(change: (data: BoardData) => BoardData, save: () => Promise<unknown>, failure: string) {
    setData(change)
    try {
      await save()
      setRevision((n) => n + 1)
      return true
    } catch {
      setNotice(failure)
      api.fetchBoard().then(setData, () => {})
      return false
    }
  }

  const changeTask = (id: string, change: (task: Task) => Task) => (board: BoardData) => ({
    ...board,
    tasks: board.tasks.map((task) => (task.id === id ? change(task) : task)),
  })

  /** The position that puts a task at the bottom of a column. */
  const endOf = (status: Status) => {
    const positions = data.tasks.filter((task) => task.status === status).map((task) => task.position)
    return positionBetween(positions.length ? Math.max(...positions) : undefined)
  }

  const linkRows = (tasks: Task[], kind: keyof typeof LINK) =>
    tasks.flatMap((task) => task[kind].map((id) => ({ task_id: task.id, [LINK[kind].column]: id })))

  /** Saves tasks plus their assignee and label links. created_at is left for the database to set. */
  async function saveTasks(tasks: Task[]) {
    await api.insert('tasks', tasks.map((task) => ({ ...api.toRow(task), created_at: undefined })))
    await Promise.all(
      (['assigneeIds', 'labelIds'] as const).map((kind) => {
        const rows = linkRows(tasks, kind)
        return rows.length ? api.insert(LINK[kind].table, rows) : null
      }),
    )
  }

  function createTask(input: NewTask) {
    const task: Task = {
      ...input,
      id: crypto.randomUUID(),
      position: endOf(input.status),
      created_at: new Date().toISOString(),
      commentCount: 0,
    }
    return mutate((board) => ({ ...board, tasks: [...board.tasks, task] }), () => saveTasks([task]), 'Could not create the task.')
  }

  function updateTask(id: string, patch: TaskPatch) {
    const current = data.tasks.find((task) => task.id === id)
    // Changing status without saying where: drop it at the bottom of the new column.
    if (patch.status && patch.status !== current?.status && patch.position === undefined) {
      patch = { ...patch, position: endOf(patch.status) }
    }
    return mutate(
      changeTask(id, (task) => ({ ...task, ...patch })),
      () => api.update('tasks', id, patch),
      'Could not save your change.',
    )
  }

  function deleteTask(id: string) {
    return mutate(
      (board) => ({ ...board, tasks: board.tasks.filter((task) => task.id !== id) }),
      () => api.remove('tasks', { id }),
      'Could not delete the task.',
    )
  }

  /** Adds or removes one assignee or label on a task. */
  function toggleLink(kind: keyof typeof LINK, taskId: string, itemId: string) {
    const isOn = data.tasks.find((task) => task.id === taskId)?.[kind].includes(itemId)
    const row = { task_id: taskId, [LINK[kind].column]: itemId }
    return mutate(
      changeTask(taskId, (task) => ({
        ...task,
        [kind]: isOn ? task[kind].filter((id) => id !== itemId) : [...task[kind], itemId],
      })),
      () => (isOn ? api.remove(LINK[kind].table, row) : api.insert(LINK[kind].table, row)),
      'Could not save your change.',
    )
  }

  function addTag(kind: TagKind, name: string, color: string) {
    const tag = { id: crypto.randomUUID(), name: name.trim(), color }
    return mutate(
      (board) => ({ ...board, [kind]: [...board[kind], tag] }),
      () => api.insert(TAG_TABLE[kind], tag),
      `Could not add "${tag.name}".`,
    )
  }

  function removeTag(kind: TagKind, id: string) {
    const linkKind = kind === 'members' ? 'assigneeIds' : 'labelIds'
    return mutate(
      (board) => ({
        ...board,
        [kind]: board[kind].filter((tag) => tag.id !== id),
        tasks: board.tasks.map((task) => ({ ...task, [linkKind]: task[linkKind].filter((linked) => linked !== id) })),
      }),
      () => api.remove(TAG_TABLE[kind], { id }),
      'Could not remove it.',
    )
  }

  function addComment(taskId: string, body: string) {
    return mutate(
      changeTask(taskId, (task) => ({ ...task, commentCount: task.commentCount + 1 })),
      () => api.insert('comments', { task_id: taskId, body: body.trim() }),
      'Could not post your comment.',
    )
  }

  function addSamples() {
    const samples = buildSamples()
    return mutate(
      (board) => ({
        tasks: [...board.tasks, ...samples.tasks],
        members: [...board.members, ...samples.members],
        labels: [...board.labels, ...samples.labels],
      }),
      async () => {
        await Promise.all([api.insert('team_members', samples.members), api.insert('labels', samples.labels)])
        await saveTasks(samples.tasks)
      },
      'Could not add the sample tasks.',
    )
  }

  return {
    ...data,
    phase,
    error,
    notice,
    revision,
    retry,
    dismissNotice,
    createTask,
    updateTask,
    deleteTask,
    toggleLink,
    addTag,
    removeTag,
    addComment,
    addSamples,
  }
}
