// Small building blocks shared across the app.
import { ChevronDown, ChevronsUp, Equal } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { PALETTE } from '../lib/types'
import type { Priority, Tag } from '../lib/types'
import { initials } from '../lib/utils'

/** Passes a tag's color to CSS as the --tag variable. */
const tint = (color: string) => ({ '--tag': color }) as CSSProperties

export function Avatar({ member }: { member: Tag }) {
  return (
    <span className="avatar" style={tint(member.color)} title={member.name}>
      {initials(member.name)}
    </span>
  )
}

export function AvatarStack({ members, max = 3 }: { members: Tag[]; max?: number }) {
  if (members.length === 0) return null
  const extra = members.length - max
  return (
    <span className="avatar-stack">
      {members.slice(0, max).map((member) => (
        <Avatar key={member.id} member={member} />
      ))}
      {extra > 0 && <span className="avatar avatar-more">+{extra}</span>}
    </span>
  )
}

export function LabelChip({ label }: { label: Tag }) {
  return (
    <span className="chip" style={tint(label.color)}>
      {label.name}
    </span>
  )
}

const PRIORITY_ICON = { high: ChevronsUp, normal: Equal, low: ChevronDown }

export function PriorityMark({ priority }: { priority: Priority }) {
  const Icon = PRIORITY_ICON[priority]
  return (
    <span className={`priority priority-${priority}`} title={`${priority} priority`}>
      <Icon size={14} strokeWidth={2.4} aria-hidden />
      <span className="sr-only">{priority} priority</span>
    </span>
  )
}

/** A row of pills where any number can be switched on. Used for assignees and labels. */
export function TogglePills(props: { options: Tag[]; selected: string[]; onToggle: (id: string) => void; empty: string }) {
  if (props.options.length === 0) return <p className="hint">{props.empty}</p>
  return (
    <div className="pills">
      {props.options.map((option) => (
        <button
          key={option.id}
          type="button"
          className="pill"
          style={tint(option.color)}
          aria-pressed={props.selected.includes(option.id)}
          onClick={() => props.onToggle(option.id)}
        >
          <span className="pill-dot" />
          {option.name}
        </button>
      ))}
    </div>
  )
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="swatches" role="radiogroup" aria-label="Color">
      {PALETTE.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={color === value}
          aria-label={color}
          className="swatch"
          style={tint(color)}
          onClick={() => onChange(color)}
        />
      ))}
    </div>
  )
}

/**
 * Built on the browser's <dialog>, which handles focus trapping, the Escape
 * key and the dimmed backdrop for us.
 */
export function Modal(props: { title: string; side?: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    return () => dialog.close()
  }, [])

  return (
    <dialog
      ref={ref}
      className={props.side ? 'modal modal-side' : 'modal'}
      aria-label={props.title}
      onCancel={(event) => {
        event.preventDefault()
        props.onClose()
      }}
      onMouseDown={(event) => {
        if (event.target === ref.current) props.onClose() // click on the backdrop
      }}
    >
      <div className="modal-body">{props.children}</div>
    </dialog>
  )
}

/** Error message that shows above everything, including open dialogs. */
export function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const toast = ref.current!
    if (!toast.matches(':popover-open')) toast.showPopover()
    const timer = setTimeout(onDismiss, 5000)
    return () => clearTimeout(timer)
  }, [message, onDismiss])

  return (
    <div ref={ref} popover="manual" role="alert" className="toast">
      {message}
      <button type="button" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  )
}

export function Select<T extends string>(props: {
  value: T
  options: { id: T; title: string }[]
  onChange: (value: T) => void
  label?: string
  className?: string
}) {
  return (
    <select
      className={props.className ?? 'input'}
      aria-label={props.label}
      value={props.value}
      onChange={(event) => props.onChange(event.target.value as T)}
    >
      {props.options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.title}
        </option>
      ))}
    </select>
  )
}
