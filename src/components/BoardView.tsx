import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragOverEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import type { Board } from '../hooks/useBoard'
import { COLUMNS } from '../lib/types'
import type { Filters, Status, Task } from '../lib/types'
import { byPosition, matchesFilters, positionBetween } from '../lib/utils'
import { SortableTask, TaskCard } from './TaskCard'

const EMPTY_COPY: Record<Status, string> = {
  todo: 'Nothing queued. Add a task to get started.',
  in_progress: 'Drag a task here when you start on it.',
  in_review: 'Tasks waiting on a second look go here.',
  done: 'Finished tasks land here.',
}

interface Props {
  board: Board
  filters: Filters
  onOpen: (taskId: string) => void
  onAdd: (status: Status) => void
}

export function BoardView({ board, filters, onOpen, onAdd }: Props) {
  // While a card is being dragged we work on a copy of the tasks ("draft"),
  // so the board can preview the move without saving anything yet.
  const [draft, setDraft] = useState<Task[] | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }), // a small move, so clicks still open the task
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }), // press and hold, so swipes still scroll
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const tasks = draft ?? board.tasks
  const visible = tasks.filter((task) => matchesFilters(task, filters))
  const isFiltering = visible.length < tasks.length
  const columnTasks = (status: Status) => visible.filter((task) => task.status === status).sort(byPosition)
  const activeTask = tasks.find((task) => task.id === activeId)

  /** A drop target is either a column or a card. Either way, which column is it in? */
  const statusOf = (id: unknown): Status | undefined =>
    COLUMNS.find((column) => column.id === id)?.id ?? tasks.find((task) => task.id === id)?.status

  const endDrag = () => {
    setDraft(null)
    setActiveId(null)
  }

  /** Fires as the card moves. When it crosses into another column, move it there in the draft. */
  function handleDragOver({ active, over }: DragOverEvent) {
    const to = statusOf(over?.id)
    if (!over || !to || to === statusOf(active.id)) return
    const target = columnTasks(to)
    const index = target.findIndex((task) => task.id === over.id) // -1 when hovering the column itself
    const position =
      index === -1
        ? positionBetween(target.at(-1)?.position)
        : positionBetween(target[index - 1]?.position, target[index].position)
    setDraft(tasks.map((task) => (task.id === active.id ? { ...task, status: to, position } : task)))
  }

  /** Fires on drop. Work out the final column and position, then save once. */
  function handleDragEnd({ active, over }: DragEndEvent) {
    const moved = tasks.find((task) => task.id === active.id)
    const original = board.tasks.find((task) => task.id === active.id)
    if (moved && original && over) {
      const column = columnTasks(moved.status)
      const from = column.findIndex((task) => task.id === active.id)
      const to = column.findIndex((task) => task.id === over.id)
      let position = moved.position
      if (to !== -1 && to !== from) {
        const reordered = arrayMove(column, from, to)
        position = positionBetween(reordered[to - 1]?.position, reordered[to + 1]?.position)
      }
      if (moved.status !== original.status || position !== original.position) {
        board.updateTask(moved.id, { status: moved.status, position })
      }
    }
    endDrag()
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={({ active }) => {
        setActiveId(String(active.id))
        setDraft(board.tasks)
      }}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={endDrag}
    >
      <main className="board">
        {COLUMNS.map((column) => (
          <Column
            key={column.id}
            status={column.id}
            title={column.title}
            tasks={columnTasks(column.id)}
            board={board}
            isTarget={activeTask?.status === column.id}
            emptyCopy={isFiltering ? 'No tasks match your filters.' : EMPTY_COPY[column.id]}
            onOpen={onOpen}
            onAdd={() => onAdd(column.id)}
          />
        ))}
      </main>
      {/* The copy of the card that follows the pointer. */}
      <DragOverlay>
        {activeTask && (
          <div className="card-lifted">
            <TaskCard task={activeTask} members={board.members} labels={board.labels} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

function Column(props: {
  status: Status
  title: string
  tasks: Task[]
  board: Board
  isTarget: boolean
  emptyCopy: string
  onOpen: (taskId: string) => void
  onAdd: () => void
}) {
  // Makes the column itself a drop target, which is what lets you drop into an empty column.
  const { setNodeRef } = useDroppable({ id: props.status })

  return (
    <section className={`column status-${props.status}`} data-target={props.isTarget || undefined} aria-label={props.title}>
      <header className="column-head">
        <span className="status-dot" />
        <h2>{props.title}</h2>
        <span className="column-count">{props.tasks.length}</span>
        <button type="button" className="icon-button" aria-label={`Add a task to ${props.title}`} onClick={props.onAdd}>
          <Plus size={16} />
        </button>
      </header>
      <SortableContext items={props.tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="column-list">
          {props.tasks.map((task) => (
            <SortableTask
              key={task.id}
              task={task}
              members={props.board.members}
              labels={props.board.labels}
              onOpen={() => props.onOpen(task.id)}
            />
          ))}
          {props.tasks.length === 0 && <p className="column-empty">{props.emptyCopy}</p>}
        </div>
      </SortableContext>
    </section>
  )
}
