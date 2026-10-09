import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Board, NewTask } from '../hooks/useBoard'
import { COLUMNS, PRIORITIES } from '../lib/types'
import type { Status } from '../lib/types'
import { Field, Modal, Select, TogglePills } from './ui'

export function NewTaskDialog({ board, status, onClose }: { board: Board; status: Status; onClose: () => void }) {
  const [draft, setDraft] = useState<NewTask>({
    title: '',
    description: '',
    status,
    priority: 'normal',
    due_date: null,
    assigneeIds: [],
    labelIds: [],
  })
  const set = (patch: Partial<NewTask>) => setDraft((current) => ({ ...current, ...patch }))
  const toggle = (kind: 'assigneeIds' | 'labelIds') => (id: string) =>
    set({ [kind]: draft[kind].includes(id) ? draft[kind].filter((other) => other !== id) : [...draft[kind], id] })

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!draft.title.trim()) return
    board.createTask({ ...draft, title: draft.title.trim() })
    onClose()
  }

  return (
    <Modal title="New task" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <h2>New task</h2>
        <Field label="Title">
          <input
            className="input"
            autoFocus
            required
            maxLength={200}
            placeholder="What needs to be done?"
            value={draft.title}
            onChange={(event) => set({ title: event.target.value })}
          />
        </Field>
        <Field label="Description">
          <textarea
            className="input"
            rows={3}
            placeholder="Add details, links or steps (optional)"
            value={draft.description}
            onChange={(event) => set({ description: event.target.value })}
          />
        </Field>
        <div className="form-row">
          <Field label="Status">
            <Select value={draft.status} options={COLUMNS} onChange={(value) => set({ status: value })} />
          </Field>
          <Field label="Priority">
            <Select value={draft.priority} options={PRIORITIES} onChange={(priority) => set({ priority })} />
          </Field>
          <Field label="Due date">
            <input
              className="input"
              type="date"
              value={draft.due_date ?? ''}
              onChange={(event) => set({ due_date: event.target.value || null })}
            />
          </Field>
        </div>
        <div className="field">
          <span className="field-label">Assignees</span>
          <TogglePills
            options={board.members}
            selected={draft.assigneeIds}
            onToggle={toggle('assigneeIds')}
            empty="No teammates yet. Add them under Team and labels."
          />
        </div>
        <div className="field">
          <span className="field-label">Labels</span>
          <TogglePills
            options={board.labels}
            selected={draft.labelIds}
            onToggle={toggle('labelIds')}
            empty="No labels yet. Add them under Team and labels."
          />
        </div>
        <div className="form-actions">
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button button-primary">
            Create task
          </button>
        </div>
      </form>
    </Modal>
  )
}
