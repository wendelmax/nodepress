"use client"

import { useState, useEffect } from "react"

export function useSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({
    blogname: "",
    blogdescription: "",
    siteurl: "",
    admin_email: "",
    site_language: "en"
  })
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        if (!data.error && !data.code) {
          setSettings({
            ...data,
            blogname: data.blogname || "",
            blogdescription: data.blogdescription || "",
            siteurl: data.siteurl || "",
            admin_email: data.admin_email || "",
            site_language: data.site_language || "en"
          })
        }
      })
      .finally(() => setIsLoading(false))
  }, [])

  const saveSettings = async (newSettings: typeof settings) => {
    setIsSaving(true)
    setMessage(null)

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings)
      })

      if (res.ok) {
        setSettings(newSettings)
        setMessage({ type: 'success', text: 'Settings saved.' })
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings.' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred.' })
    } finally {
      setIsSaving(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  return {
    settings,
    setSettings, // Provide setter so component can control inputs
    isLoading,
    isSaving,
    message,
    saveSettings
  }
}
