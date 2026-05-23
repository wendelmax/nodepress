"use client"

import { useState, useEffect } from "react"

interface PluginInfo {
  id: string
  name: string
  version: string
  description: string
  author: string
  authorUrl?: string
}

const pluginsList: PluginInfo[] = [
  {
    id: "hello-dolly",
    name: "Hello Dolly 🎵",
    version: "1.0.0",
    description: "Injects a random lyric from the famous Hello Dolly song into the admin topbar. An homage to the original WordPress plugin.",
    author: "NodePress Contributors"
  },
  {
    id: "seo-optimizer",
    name: "SEO Optimizer 🔍",
    version: "1.0.0",
    description: "Automatically appends an optimized canonical SEO block to the end of every public post content before frontend rendering.",
    author: "NodePress SEO Team"
  }
]

export default function PluginsPage() {
  const [activePlugins, setActivePlugins] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    fetch("/api/options?keys=active_plugins")
      .then(res => res.json())
      .then(data => {
        const active = data.active_plugins ? JSON.parse(data.active_plugins) : ["hello-dolly", "seo-optimizer"]
        setActivePlugins(active)
      })
      .catch(() => {
        // Fallback default
        setActivePlugins(["hello-dolly", "seo-optimizer"])
      })
      .finally(() => setIsLoading(false))
  }, [])

  const handleToggle = async (pluginId: string) => {
    setIsUpdating(pluginId)
    setMessage(null)

    const isCurrentlyActive = activePlugins.includes(pluginId)
    const newActivePlugins = isCurrentlyActive
      ? activePlugins.filter(id => id !== pluginId)
      : [...activePlugins, pluginId]

    try {
      const res = await fetch("/api/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active_plugins: JSON.stringify(newActivePlugins)
        })
      })

      if (res.ok) {
        setActivePlugins(newActivePlugins)
        setMessage({
          type: "success",
          text: `Plugin "${pluginsList.find(p => p.id === pluginId)?.name}" successfully ${isCurrentlyActive ? "deactivated" : "activated"}.`
        })
      } else {
        throw new Error("Failed to save")
      }
    } catch (e) {
      setMessage({
        type: "error",
        text: "Failed to update plugin status. Please try again."
      })
    } finally {
      setIsUpdating(null)
      setTimeout(() => setMessage(null), 4000)
    }
  }

  if (isLoading) {
    return <div style={{ padding: "20px", color: "#646970" }}>Loading plugins...</div>
  }

  return (
    <div style={{ maxWidth: "900px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <h1 style={{ fontSize: "23px", fontWeight: 400, margin: 0, padding: "9px 15px 4px 0" }}>Plugins</h1>
      </div>
      <p style={{ color: "#646970", marginBottom: "24px", fontSize: "14px" }}>
        Extend and expand the capabilities of NodePress. Activate or deactivate tools dynamically across your site.
      </p>

      {message && (
        <div style={{
          borderLeft: `4px solid ${message.type === "success" ? "#00a32a" : "#d63638"}`,
          backgroundColor: "#fff",
          padding: "16px",
          marginBottom: "24px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)",
          borderRadius: "4px",
          animation: "fadeIn 0.3s ease-in-out",
          transition: "all 0.3s ease"
        }}>
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 500, color: message.type === "success" ? "#00641a" : "#9f1215" }}>{message.text}</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {pluginsList.map(plugin => {
          const isActive = activePlugins.includes(plugin.id)
          const updating = isUpdating === plugin.id

          return (
            <div 
              key={plugin.id} 
              style={{
                backgroundColor: "white",
                border: isActive ? "1px solid #c8d7e1" : "1px solid #c3c4c7",
                borderLeft: isActive ? "4px solid #2271b1" : "4px solid #8c8f94",
                borderRadius: "4px",
                display: "flex",
                padding: "24px",
                boxShadow: "0 1px 3px rgba(0,0,0,.04)",
                gap: "24px",
                alignItems: "flex-start",
                transition: "all 0.2s ease",
                opacity: updating ? 0.7 : 1
              }}
            >
              {/* Plugin Details */}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#1d2327" }}>
                    {plugin.name}
                  </h3>
                  <span style={{ 
                    fontSize: "11px", 
                    backgroundColor: "#f0f0f1", 
                    color: "#646970", 
                    padding: "2px 8px", 
                    borderRadius: "3px", 
                    fontWeight: 500 
                  }}>
                    v{plugin.version}
                  </span>
                  <span style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "3px",
                    backgroundColor: isActive ? "#d2e4fc" : "#f0f0f1",
                    color: isActive ? "#154c8c" : "#646970"
                  }}>
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p style={{ margin: "0 0 16px 0", color: "#3c434a", fontSize: "14px", lineHeight: "1.6" }}>
                  {plugin.description}
                </p>
                <div style={{ fontSize: "12px", color: "#646970" }}>
                  By <strong>{plugin.author}</strong>
                </div>
              </div>

              {/* Toggle Switch */}
              <div style={{ display: "flex", alignItems: "center", height: "100%", alignSelf: "center" }}>
                <button
                  onClick={() => handleToggle(plugin.id)}
                  disabled={updating}
                  style={{
                    border: "none",
                    background: "none",
                    cursor: updating ? "not-allowed" : "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center"
                  }}
                  title={isActive ? "Deactivate" : "Activate"}
                >
                  {/* Custom animated slider */}
                  <div style={{
                    width: "56px",
                    height: "28px",
                    borderRadius: "14px",
                    backgroundColor: isActive ? "#2271b1" : "#8c8f94",
                    position: "relative",
                    transition: "background-color 0.25s ease",
                    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)"
                  }}>
                    <div style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      backgroundColor: "white",
                      position: "absolute",
                      top: "3px",
                      left: isActive ? "31px" : "3px",
                      transition: "left 0.25s ease",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                    }} />
                  </div>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
