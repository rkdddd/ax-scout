import * as React from "react"
import { cn } from "cn"

// 칸이 회색으로 채워져 있고, 누르면 흰색 바탕에 파란 테두리가 켜진다.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-xl border border-transparent bg-input px-4 text-[15px] transition-colors duration-150 outline-none placeholder:text-[#adb5bd] hover:bg-[#eceff2] focus-visible:border-ring focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-ring/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:bg-background aria-invalid:ring-3 aria-invalid:ring-destructive/15",
        className
      )}
      {...props}
    />
  )
}

export { Input }
