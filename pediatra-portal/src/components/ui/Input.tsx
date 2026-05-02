import { InputHTMLAttributes, forwardRef } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, Props>(({ label, error, className = '', ...rest }, ref) => (
  <div className="flex flex-col gap-1.5">
    {label && (
      <label className="text-[13px] font-[600] text-[#1c1b2b]">{label}</label>
    )}
    <input
      ref={ref}
      className={`w-full rounded-[6px] border px-4 py-3 text-[14px] font-[400] text-[#1c1b2b] placeholder:text-[#9e9cb0] outline-none transition-colors duration-150
        ${error
          ? 'border-[#b3001f] focus:border-[#b3001f] focus:ring-2 focus:ring-[#ffd9dd]'
          : 'border-[#d5d3de] bg-white focus:border-[#7056e0] focus:ring-2 focus:ring-[#e8e1ff]'}
        ${className}`}
      {...rest}
    />
    {error && <p className="text-[12px] text-[#b3001f]">{error}</p>}
  </div>
))

Input.displayName = 'Input'
export default Input
