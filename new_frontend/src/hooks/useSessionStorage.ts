import { useState, useEffect } from "react"

export function useSessionStorage(key: string) {
  const [value, setValue] = useState<string | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem(key)
    if (stored) setValue(stored)
  }, [key])

  return [value, setValue] as const
}