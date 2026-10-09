import { Plus, Search, Users } from 'lucide-react'
import type { Board } from '../hooks/useBoard'
import { COLUMNS, NO_FILTERS, PRIORITIES } from '../lib/types'
import type { Filters, Task } from '../lib/types'
import { isOverdue } from '../lib/utils'
import { AvatarStack, Select } from './ui'

interface Props {
  board: Board
  filters: Filters
  onFilters: (filters: Filters) => void
  onNewTask: () => void
  onManage: () => void
}

export function Header({ board, filters, onFilters, onNewTask, onManage }: Props) {
  const set = (patch: Partial<Filters>) => onFilters({ ...filters, ...patch })
  const isFiltering = Object.values(filters).some(Boolean)
  const filterClass = (value: string) => (value ? 'filter is-active' : 'filter')

  return (
    <header className="topbar">
      <div className="topbar-row">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            <i /><i /><i /><i />
          </span>
          <h1>Relay</h1>
        </div>
        <Summary tasks={board.tasks} />
        <div className="topbar-actions">
          <button type="button" className="button" onClick={onManage}>
            {board.members.length > 0 ? <AvatarStack members={board.members} max={4} /> : <Users size={16} />}
            Team and labels
          </button>
          <button type="button" className="button button-primary" onClick={onNewTask}>
            <Plus size={16} />
            New task
          </button>
        </div>
      </div>

      <div className="filters">
        <label className="search">
          <Search size={15} aria-hidden />
          <input
            type="search"
            placeholder="Search tasks"
            aria-label="Search tasks by title"
            value={filters.search}
            onChange={(event) => set({ search: event.target.value })}
          />
        </label>
        <Select
          label="Filter by priority"
          className={filterClass(filters.priority)}
          value={filters.priority}
          options={[{ id: '', title: 'Any priority' }, ...PRIORITIES]}
          onChange={(priority) => set({ priority })}
        />
        <Select
          label="Filter by assignee"
          className={filterClass(filters.memberId)}
          value={filters.memberId}
          options={[{ id: '', title: 'Anyone' }, ...board.members.map((m) => ({ id: m.id, title: m.name }))]}
          onChange={(memberId) => set({ memberId })}
        />
        <Select
          label="Filter by label"
          className={filterClass(filters.labelId)}
          value={filters.labelId}
          options={[{ id: '', title: 'Any label' }, ...board.labels.map((l) => ({ id: l.id, title: l.name }))]}
          onChange={(labelId) => set({ labelId })}
        />
        {isFiltering && (
          <button type="button" className="link-button" onClick={() => onFilters(NO_FILTERS)}>
            Clear filters
          </button>
        )}
      </div>
    </header>
  )
}

/** Board stats: one bar split by status, plus the three headline counts. */
function Summary({ tasks }: { tasks: Task[] }) {
  const count = (status: string) => tasks.filter((task) => task.status === status).length
  const done = count('done')
  const overdue = tasks.filter(isOverdue).length

  return (
    <section className="summary" aria-label="Board summary">
      <div className="track" role="img" aria-label={`${done} of ${tasks.length} tasks done`}>
        {COLUMNS.filter((column) => count(column.id) > 0).map((column) => (
          <span
            key={column.id}
            className={`track-part status-${column.id}`}
            style={{ flexGrow: count(column.id) }}
            title={`${column.title}: ${count(column.id)}`}
          />
        ))}
      </div>
      <dl className="stats">
        <Stat label="Tasks" value={tasks.length} />
        <Stat label="Done" value={done} />
        <Stat label="Overdue" value={overdue} alert={overdue > 0} />
      </dl>
    </section>
  )
}

function Stat({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className={alert ? 'stat is-alert' : 'stat'}>
      <dd>{value}</dd>
      <dt>{label}</dt>
    </div>
  )
}
