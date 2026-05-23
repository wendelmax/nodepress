"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

type FieldType = "text" | "number" | "url" | "textarea"

interface Field {
  name: string
  label: string
  type: FieldType
}

interface FieldGroup {
  id: string
  title: string
  postType: string
  fields: Field[]
}

export default function FieldGroupEditor() {
  const router = useRouter()
  const [groups, setGroups] = useState<FieldGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetch('/api/options?keys=acf_field_groups')
      .then(res => res.json())
      .then(data => {
        if (data.acf_field_groups) {
          try {
            setGroups(JSON.parse(data.acf_field_groups))
          } catch (e) {
            console.error("Failed to parse field groups")
          }
        }
        setIsLoading(false)
      })
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acf_field_groups: JSON.stringify(groups) })
      })

      if (res.ok) {
        alert('Field Groups saved successfully!')
        router.refresh()
      } else {
        alert('Failed to save field groups.')
      }
    } catch (e) {
      alert('Error saving field groups.')
    } finally {
      setIsSaving(false)
    }
  }

  const addGroup = () => {
    const newGroup: FieldGroup = {
      id: `group_${Date.now()}`,
      title: 'New Field Group',
      postType: 'post',
      fields: []
    }
    setGroups([...groups, newGroup])
  }

  const removeGroup = (groupId: string) => {
    if (confirm('Are you sure you want to remove this group?')) {
      setGroups(groups.filter(g => g.id !== groupId))
    }
  }

  const addField = (groupId: string) => {
    const newGroups = groups.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          fields: [...g.fields, { label: 'New Field', name: `field_${Date.now()}`, type: 'text' as FieldType }]
        }
      }
      return g
    })
    setGroups(newGroups)
  }

  const removeField = (groupId: string, fieldIndex: number) => {
    const newGroups = groups.map(g => {
      if (g.id === groupId) {
        const newFields = [...g.fields]
        newFields.splice(fieldIndex, 1)
        return { ...g, fields: newFields }
      }
      return g
    })
    setGroups(newGroups)
  }

  const updateGroup = (groupId: string, key: string, value: string) => {
    setGroups(groups.map(g => g.id === groupId ? { ...g, [key]: value } : g))
  }

  const updateField = (groupId: string, fieldIndex: number, key: string, value: string) => {
    setGroups(groups.map(g => {
      if (g.id === groupId) {
        const newFields = [...g.fields]
        newFields[fieldIndex] = { ...newFields[fieldIndex], [key]: value }
        return { ...g, fields: newFields }
      }
      return g
    }))
  }

  if (isLoading) return <div className="p-6 text-text-muted flex items-center gap-2"><span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span> Loading...</div>

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-text leading-tight">Custom Fields</h1>
        <div className="flex gap-3">
          <button 
            onClick={addGroup}
            className="px-4 py-2 rounded-xl bg-white/5 border border-border text-text-secondary hover:text-white hover:bg-white/10 text-sm font-semibold transition-all"
          >
            Add New Group
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-primary-gradient text-white font-bold text-sm hover:shadow-neon transition-all border-none"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="bg-background-secondary border border-border p-10 rounded-2xl text-center text-text-muted shadow-soft">
          No Field Groups found. Click &quot;Add New Group&quot; to create one.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <div key={group.id} className="bg-surface-elevated border border-border rounded-2xl shadow-soft overflow-hidden">
              <div className="p-5 border-b border-border bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                  <input 
                    type="text" 
                    value={group.title} 
                    onChange={(e) => updateGroup(group.id, 'title', e.target.value)}
                    className="text-base font-semibold px-3 py-1.5 bg-background-tertiary border border-border rounded-lg focus:border-primary/50 outline-none text-text transition-colors sm:w-[250px]"
                    placeholder="Group Title"
                  />
                  <select 
                    value={group.postType}
                    onChange={(e) => updateGroup(group.id, 'postType', e.target.value)}
                    className="px-3 py-1.5 bg-background-tertiary border border-border rounded-lg text-sm text-text focus:border-primary/50 outline-none transition-colors"
                  >
                    <option value="post">Show on Posts</option>
                    <option value="page">Show on Pages</option>
                  </select>
                </div>
                <button 
                  onClick={() => removeGroup(group.id)}
                  className="text-danger hover:text-red-400 bg-transparent border-none text-sm font-semibold underline cursor-pointer self-start sm:self-auto"
                >
                  Delete Group
                </button>
              </div>

              <div className="p-5 overflow-x-auto">
                <table className="w-full min-w-[600px] border-collapse mb-5">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                      <th className="p-3 w-[30%]">Field Label</th>
                      <th className="p-3 w-[30%]">Field Name (DB Key)</th>
                      <th className="p-3 w-[30%]">Field Type</th>
                      <th className="p-3 w-[10%] text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.fields.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-5 text-center text-text-muted text-sm border-b border-border/50">No fields in this group.</td>
                      </tr>
                    ) : (
                      group.fields.map((field, idx) => (
                        <tr key={idx} className="border-b border-border/50 hover:bg-white/[0.01] transition-colors">
                          <td className="p-3">
                            <input 
                              type="text" 
                              value={field.label}
                              onChange={(e) => updateField(group.id, idx, 'label', e.target.value)}
                              className="w-full px-3 py-2 bg-background-tertiary border border-border rounded-lg text-sm text-text focus:border-primary/50 outline-none transition-colors"
                            />
                          </td>
                          <td className="p-3">
                            <input 
                              type="text" 
                              value={field.name}
                              onChange={(e) => updateField(group.id, idx, 'name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                              className="w-full px-3 py-2 bg-white/5 border border-border rounded-lg text-sm text-text-secondary font-mono focus:border-primary/50 outline-none transition-colors"
                            />
                          </td>
                          <td className="p-3">
                            <select 
                              value={field.type}
                              onChange={(e) => updateField(group.id, idx, 'type', e.target.value)}
                              className="w-full px-3 py-2 bg-background-tertiary border border-border rounded-lg text-sm text-text focus:border-primary/50 outline-none transition-colors"
                            >
                              <option value="text">Text</option>
                              <option value="textarea">Textarea</option>
                              <option value="number">Number</option>
                              <option value="url">URL</option>
                            </select>
                          </td>
                          <td className="p-3 text-center">
                            <button 
                              onClick={() => removeField(group.id, idx)}
                              className="w-8 h-8 rounded-lg border border-danger/30 text-danger hover:bg-danger/10 flex items-center justify-center transition-colors mx-auto cursor-pointer"
                              title="Remove field"
                            >
                              <span className="text-lg leading-none mt-[-2px]">&times;</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                <div className="flex justify-end">
                  <button 
                    onClick={() => addField(group.id)}
                    className="px-4 py-2 rounded-xl bg-primary/10 text-primary-light border border-primary/20 hover:bg-primary/20 text-sm font-semibold transition-all flex items-center gap-1.5"
                  >
                    <span className="text-lg leading-none mt-[-1px]">+</span> Add Field
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
