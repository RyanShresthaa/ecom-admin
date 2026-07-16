import { useEffect, useState } from 'react'

// Input helper: returns value only after inactivity delay.
export function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value)

  // Timer block: reset debounce timer whenever value/delay changes.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
