import { useState } from 'react'
import { BoardView } from './components/BoardView'
import { Header } from './components/Header'
import { ManageDialog } from './components/ManageDialog'
import { NewTaskDialog } from './components/NewTaskDialog'
import { TaskPanel } from './components/TaskPanel'
import { Toast } from './components/ui'
import { useBoard } from './hooks/useBoard'
import { COLUMNS, NO_FILTERS } from './lib/types'
import type { Filters, Status } from './lib/types'

export default function App() {
  const board = useBoard()
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [newTaskStatus, setNewTaskStatus] = useState<Status | null>(null)
  const [isManaging, setIsManaging] = useState(false)

  if (board.phase === 'error') {
    return (
      <div className="screen">
        <h1>The board could not load</h1>
        <p>{board.error}</p>
        <button type="button" className="button button-primary" onClick={board.retry}>
          Try again
        </button>
      </div>
    )
  }

  const openTask = board.tasks.find((task) => task.id === openTaskId)

  return (
    <div className="app">
      <Header
        board={board}
        filters={filters}
        onFilters={setFilters}
        onNewTask={() => setNewTaskStatus('todo')}
        onManage={() => setIsManaging(true)}
      />

      {board.phase === 'loading' ? (
        <BoardSkeleton />
      ) : (
        <>
          {board.tasks.length === 0 && (
            <div className="welcome">
              <div>
                <h2>Your board is empty</h2>
                <p>Add your first task, or load a few sample tasks to see how the board works.</p>
              </div>
              <button type="button" className="button" onClick={board.addSamples}>
                Add sample tasks
              </button>
              <button type="button" className="button button-primary" onClick={() => setNewTaskStatus('todo')}>
                New task
              </button>
            </div>
          )}
          <BoardView board={board} filters={filters} onOpen={setOpenTaskId} onAdd={setNewTaskStatus} />
        </>
      )}

      {openTask && <TaskPanel key={openTask.id} task={openTask} board={board} onClose={() => setOpenTaskId(null)} />}
      {newTaskStatus && <NewTaskDialog board={board} status={newTaskStatus} onClose={() => setNewTaskStatus(null)} />}
      {isManaging && <ManageDialog board={board} onClose={() => setIsManaging(false)} />}
      {board.notice && <Toast message={board.notice} onDismiss={board.dismissNotice} />}
    </div>
  )
}

/** Placeholder columns shown while the first load is in flight. */
function BoardSkeleton() {
  return (
    <main className="board" aria-busy="true" aria-label="Loading your board">
      {COLUMNS.map((column, index) => (
        <section key={column.id} className={`column status-${column.id}`}>
          <header className="column-head">
            <span className="status-dot" />
            <h2>{column.title}</h2>
          </header>
          <div className="column-list">
            {Array.from({ length: 3 - (index % 3) }, (_, i) => (
              <div key={i} className="skeleton" />
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}
