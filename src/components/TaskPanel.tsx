import { Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Board } from '../hooks/useBoard'
import { fetchTaskDetail } from '../lib/api'
import { COLUMNS, PRIORITIES, STATUS_TITLE } from '../lib/types'
import type { Activity, Comment, Status, Task } from '../lib/types'
import { formatDay, formatTimestamp, timeAgo } from '../lib/utils'
import { Field, Modal, Select, TogglePills } from './ui'

/** Turns one activity row into a sentence. */
function describe({ type, meta }: Activity): string {
  const status = (value: string | null) => STATUS_TITLE[value as Status] ?? value
  const name = meta.name ?? 'a removed item'
  switch (type) {
    case 'created':
      return `Created in ${status(meta.to)}`
    case 'moved':
      return `Moved from ${status(meta.from)} → ${status(meta.to)}`
    case 'renamed':
      return `Renamed to "${meta.to}"`
    case 'description':
      return 'Edited the description'
    case 'priority':
      return `Changed priority from ${meta.from} to ${meta.to}`
    case 'due_date':
      return meta.to ? `Set the due date to ${formatDay(meta.to)}` : 'Removed the due date'
    case 'assigned':
      return `Assigned ${name}`
    case 'unassigned':
      return `Unassigned ${name}`
    case 'label_added':
      return `Added the label ${name}`
    case 'label_removed':
      return `Removed the label ${name}`
    default:
      return 'Updated the task'
  }
}

/** The slide-over that opens when you click a task. Every field saves as soon as you change it. */
export function TaskPanel({ task, board, onClose }: { task: Task; board: Board; onClose: () => void }) {
  const [detail, setDetail] = useState<{ comments: Comment[]; activity: Activity[] } | null>(null)
  const [failed, setFailed] = useState(false)
  const [tab, setTab] = useState<'comments' | 'activity'>('comments')
  const [comment, setComment] = useState('')

  // Reload comments and history whenever something on the board is saved.
  useEffect(() => {
    let current = true
    fetchTaskDetail(task.id).then(
      (loaded) => current && (setDetail(loaded), setFailed(false)),
      () => current && setFailed(true),
    )
    return () => {
      current = false
    }
  }, [task.id, board.revision])

  async function postComment(event: FormEvent) {
    event.preventDefault()
    if (!comment.trim()) return
    if (await board.addComment(task.id, comment)) setComment('')
  }

  function remove() {
    board.deleteTask(task.id)
    onClose()
  }

  return (
    <Modal title="Task details" side onClose={onClose}>
      <header className="panel-head">
        <span className={`status-pill status-${task.status}`}>
          <span className="status-dot" />
          {STATUS_TITLE[task.status]}
        </span>
        <button type="button" className="icon-button" aria-label="Delete task" title="Delete task" onClick={remove}>
          <Trash2 size={16} />
        </button>
        <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
          <X size={18} />
        </button>
      </header>

      <div className="panel-scroll">
        <input
          className="panel-title"
          aria-label="Title"
          maxLength={200}
          defaultValue={task.title}
          onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
          onBlur={(event) => {
            const title = event.target.value.trim()
            if (!title) event.target.value = task.title // a task always needs a title
            else if (title !== task.title) board.updateTask(task.id, { title })
          }}
        />

        <div className="form-row">
          <Field label="Status">
            <Select value={task.status} options={COLUMNS} onChange={(status) => board.updateTask(task.id, { status })} />
          </Field>
          <Field label="Priority">
            <Select
              value={task.priority}
              options={PRIORITIES}
              onChange={(priority) => board.updateTask(task.id, { priority })}
            />
          </Field>
          <Field label="Due date">
            <input
              className="input"
              type="date"
              value={task.due_date ?? ''}
              onChange={(event) => board.updateTask(task.id, { due_date: event.target.value || null })}
            />
          </Field>
        </div>

        <div className="field">
          <span className="field-label">Assignees</span>
          <TogglePills
            options={board.members}
            selected={task.assigneeIds}
            onToggle={(id) => board.toggleLink('assigneeIds', task.id, id)}
            empty="No teammates yet. Add them under Team and labels."
          />
        </div>
        <div className="field">
          <span className="field-label">Labels</span>
          <TogglePills
            options={board.labels}
            selected={task.labelIds}
            onToggle={(id) => board.toggleLink('labelIds', task.id, id)}
            empty="No labels yet. Add them under Team and labels."
          />
        </div>

        <Field label="Description">
          <textarea
            className="input"
            rows={4}
            placeholder="Add details, links or steps"
            defaultValue={task.description}
            onBlur={(event) => {
              if (event.target.value !== task.description) board.updateTask(task.id, { description: event.target.value })
            }}
          />
        </Field>

        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'comments'} onClick={() => setTab('comments')}>
            Comments <span className="tab-count">{task.commentCount}</span>
          </button>
          <button type="button" role="tab" aria-selected={tab === 'activity'} onClick={() => setTab('activity')}>
            Activity
          </button>
        </div>

        {failed && <p className="hint is-error">Could not load this task's history. Check your connection and reopen it.</p>}
        {!detail && !failed && <p className="hint">Loading…</p>}

        {detail && tab === 'comments' && (
          <>
            {detail.comments.length === 0 && <p className="hint">No comments yet. Leave a note for your future self.</p>}
            <ol className="comments">
              {detail.comments.map((item) => (
                <li key={item.id}>
                  <div className="comment-head">
                    <strong>You</strong>
                    <time dateTime={item.created_at}>{formatTimestamp(item.created_at)}</time>
                  </div>
                  <p>{item.body}</p>
                </li>
              ))}
            </ol>
            <form className="composer" onSubmit={postComment}>
              <textarea
                className="input"
                rows={2}
                maxLength={2000}
                placeholder="Write a comment"
                aria-label="Write a comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) event.currentTarget.form?.requestSubmit()
                }}
              />
              <button type="submit" className="button button-primary" disabled={!comment.trim()}>
                Post comment
              </button>
            </form>
          </>
        )}

        {detail && tab === 'activity' && (
          <ol className="timeline">
            {detail.activity.map((item) => (
              <li key={item.id}>
                <span>{describe(item)}</span>
                <time dateTime={item.created_at} title={formatTimestamp(item.created_at)}>
                  {timeAgo(item.created_at)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Modal>
  )
}
