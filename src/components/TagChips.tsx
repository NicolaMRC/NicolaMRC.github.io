import { definizioneTag } from '../lib/tags'

interface Props {
  tags: string[]
  /** Solo le emoji, per gli spazi stretti come le righe della settimana. */
  soloEmoji?: boolean
}

/** Visualizzazione dei tag di un menu, in sola lettura. */
export default function TagChips({ tags, soloEmoji }: Props) {
  if (tags.length === 0) return null

  if (soloEmoji) {
    return (
      <span className="fila-emoji" aria-label={tags.map((t) => definizioneTag(t).label).join(', ')}>
        {tags.map((id) => (
          <span key={id}>{definizioneTag(id).emoji}</span>
        ))}
      </span>
    )
  }

  return (
    <div className="gruppo-chip">
      {tags.map((id) => {
        const tag = definizioneTag(id)
        return (
          <span key={id} className="chip statico">
            <span className="chip-emoji">{tag.emoji}</span>
            {tag.label}
          </span>
        )
      })}
    </div>
  )
}
