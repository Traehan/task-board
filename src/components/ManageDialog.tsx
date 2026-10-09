import { Trash2, X } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Board, TagKind } from '../hooks/useBoard'
import { PALETTE } from '../lib/types'
import { Avatar, ColorPicker, LabelChip, Modal } from './ui'

export function ManageDialog({ board, onClose }: { board: Board; onClose: () => void }) {
  return (
    <Modal title="Team and labels" onClose={onClose}>
      <div className="form">
        <header className="dialog-head">
          <h2>Team and labels</h2>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <TagManager board={board} kind="members" title="Team" placeholder="Teammate's name" empty="Add the people you work with, then assign them to tasks." />
        <TagManager board={board} kind="labels" title="Labels" placeholder="Label name, like Bug" empty="Labels group related tasks. You can filter the board by them." />
      </div>
    </Modal>
  )
}

/** One list plus an add form. Team members and labels are both name + color, so they share this. */
function TagManager(props: { board: Board; kind: TagKind; title: string; placeholder: string; empty: string }) {
  const tags = props.board[props.kind]
  const [name, setName] = useState('')
  const [color, setColor] = useState(PALETTE[tags.length % PALETTE.length])

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    props.board.addTag(props.kind, name, color)
    setName('')
    setColor(PALETTE[(tags.length + 1) % PALETTE.length])
  }

  return (
    <section className="manager">
      <h3>{props.title}</h3>
      {tags.length === 0 && <p className="hint">{props.empty}</p>}
      <ul className="tag-list">
        {tags.map((tag) => (
          <li key={tag.id}>
            {props.kind === 'members' ? <Avatar member={tag} /> : <LabelChip label={tag} />}
            {props.kind === 'members' && <span>{tag.name}</span>}
            <button
              type="button"
              className="icon-button"
              aria-label={`Remove ${tag.name}`}
              onClick={() => props.board.removeTag(props.kind, tag.id)}
            >
              <Trash2 size={15} />
            </button>
          </li>
        ))}
      </ul>
      <form className="manager-add" onSubmit={submit}>
        <input
          className="input"
          maxLength={props.kind === 'members' ? 60 : 30}
          placeholder={props.placeholder}
          aria-label={props.placeholder}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <ColorPicker value={color} onChange={setColor} />
        <button type="submit" className="button" disabled={!name.trim()}>
          Add
        </button>
      </form>
    </section>
  )
}
