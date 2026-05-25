import { useState, useEffect } from "react"

export function useOptions(keys?: string[]) {
  const [options, setOptions] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let url = '/api/options'
    if (keys && keys.length > 0) {
      url += `?keys=${keys.join(',')}`
    }

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setOptions(data)
        }
      })
      .finally(() => setIsLoading(false))
  }, [keys?.join(',')])

  const updateOption = async (key: string, value: string) => {
    try {
      const res = await fetch('/api/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value })
      })

      if (res.ok) {
        setOptions(prev => ({ ...prev, [key]: value }))
        return true
      }
      return false
    } catch (err) {
      console.error("Failed to update option", err)
      return false
    }
  }

  return {
    options,
    isLoading,
    updateOption
  }
}
