// Sample data so a first-time visitor can see a full board in one click.
import { PALETTE } from './types'
import type { BoardData, Priority, Status, Tag, Task } from './types'

function dayFromNow(offset: number): string {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function buildSamples(): BoardData {
  const tag = (name: string, color: string): Tag => ({ id: crypto.randomUUID(), name, color })
  const [maya, diego, priya] = [tag('Maya Chen', PALETTE[3]), tag('Diego Ruiz', PALETTE[5]), tag('Priya Nair', PALETTE[6])]
  const [bug, feature, design] = [tag('Bug', PALETTE[4]), tag('Feature', PALETTE[0]), tag('Design', PALETTE[2])]

  let position = 0
  const task = (
    status: Status,
    title: string,
    priority: Priority,
    due: number | null,
    assignees: Tag[],
    labels: Tag[],
    description = '',
  ): Task => ({
    id: crypto.randomUUID(),
    title,
    description,
    status,
    priority,
    due_date: due === null ? null : dayFromNow(due),
    position: position++,
    created_at: new Date().toISOString(),
    assigneeIds: assignees.map((member) => member.id),
    labelIds: labels.map((label) => label.id),
    commentCount: 0,
  })

  return {
    members: [maya, diego, priya],
    labels: [bug, feature, design],
    tasks: [
      task('todo', 'Fix crash when opening an expired invite link', 'high', -1, [diego], [bug], 'Happens on Android 14 when the link is older than 7 days.'),
      task('todo', 'Write release notes for version 2.4', 'normal', 5, [priya], [feature]),
      task('todo', 'Check color contrast on the settings screens', 'low', null, [maya], [design]),
      task('in_progress', 'Build the offline sync queue', 'high', 2, [diego, maya], [feature], 'Queue edits made offline and replay them in order once the connection is back.'),
      task('in_progress', 'Redraw the empty inbox illustration', 'normal', 0, [maya], [design]),
      task('in_review', 'Add rate limiting to the sign-in endpoint', 'high', 1, [priya], [feature, bug]),
      task('done', 'Set up crash reporting', 'normal', -3, [diego], []),
      task('done', 'Move avatars to the new image CDN', 'low', null, [priya], [feature]),
    ],
  }
}
