interface Props {
  value: boolean
  onChange: () => void
}

export default function Toggle({ value, onChange }: Props) {
  return (
    <button
      onClick={onChange}
      className={`w-11 h-6 rounded-full relative transition-colors flex-shrink-0 ${
        value ? 'bg-primary/40' : 'bg-surface-variant'
      }`}
    >
      <div
        className={`w-5 h-5 rounded-full absolute top-0.5 transition-all ${
          value ? 'right-0.5 bg-primary' : 'left-0.5 bg-on-surface-variant/50'
        }`}
      />
    </button>
  )
}
