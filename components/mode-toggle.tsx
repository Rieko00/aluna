"use client"

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "@/components/theme-provider"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Prevent hydration mismatch — only render icon after mount
  React.useEffect(() => setMounted(true), [])

  const resolvedDark = React.useMemo(() => {
    if (!mounted) return false
    if (theme === "dark") return true
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
    }
    return false
  }, [theme, mounted])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="icon-btn" title="Toggle theme">
          {mounted ? (
            resolvedDark ? <Moon size={18} /> : <Sun size={18} />
          ) : (
            <Sun size={18} />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun size={14} style={{ marginRight: 8 }} /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon size={14} style={{ marginRight: 8 }} /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor size={14} style={{ marginRight: 8 }} /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
