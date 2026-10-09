import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CalendarDays, MessageSquare } from 'lucide-react'
import type { Tag, Task } from '../lib/types'
import { dueInfo } from '../lib/utils'
import { AvatarStack, LabelChip, PriorityMark } from './ui'

interface Props {
  task: Task
  members: Tag[]
  labels: Tag[]
}

/** How a task looks on the board. No drag logic in here. */
export function TaskCard({ task, members, labels }: Props) {
  const due = dueInfo(task)
  const taskLabels = labels.filter((label) => task.labelIds.includes(label.id))
  const assignees = members.filter((member) => task.assigneeIds.includes(member.id))

  return (
    <article className="card">
      {taskLabels.length > 0 && (
        <div className="card-labels">
          {taskLabels.map((label) => (
            <LabelChip key={label.id} label={label} />
          ))}
        </div>
      )}
      {/* A real button so keyboard users can open the task with Enter. */}
      <button type="button" className="card-title">
        {task.title}
      </button>
      <footer className="card-meta">
        <PriorityMark priority={task.priority} />
        {due && (
          <span className={`due due-${due.urgency}`}>
            <CalendarDays size={13} aria-hidden />
            {due.label}
          </span>
        )}
        {task.commentCount > 0 && (
          <span className="card-comments" title="Comments">
            <MessageSquare size={13} aria-hidden />
            {task.commentCount}
          </span>
        )}
        <AvatarStack members={assignees} />
      </footer>
    </article>
  )
}

/** Wraps a card so it can be picked up and sorted. Clicking it opens the task. */
export function SortableTask(props: Props & { onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.task.id })

  return (
    <div
      ref={setNodeRef}
      className={isDragging ? 'card-slot is-dragging' : 'card-slot'}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      onClick={props.onOpen}
      {...attributes}
      {...listeners}
    >
      <TaskCard task={props.task} members={props.members} labels={props.labels} />
    </div>
  )
}
