import { SelectHTMLAttributes, forwardRef } from 'react'

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

const Select = forwardRef<HTMLSelectElement, Props>(({ label, error, className = '', children, ...rest }, ref) => (
  <div className="flex flex-col gap-1.5">
    {label && (
      <label className="text-[13px] font-[600] text-[#1c1b2b]">{label}</label>
    )}
    <select
      ref={ref}
      className={`w-full rounded-[6px] border px-4 py-3 text-[14px] font-[400] text-[#1c1b2b] bg-white outline-none transition-colors duration-150 appearance-none cursor-pointer
        ${error
          ? 'border-[#b3001f] focus:border-[#b3001f] focus:ring-2 focus:ring-[#ffd9dd]'
          : 'border-[#d5d3de] focus:border-[#7056e0] focus:ring-2 focus:ring-[#e8e1ff]'}
        ${className}`}
      {...rest}
    >
      {children}
    </select>
    {error && <p className="text-[12px] text-[#b3001f]">{error}</p>}
  </div>
))

Select.displayName = 'Select'
export default Select
