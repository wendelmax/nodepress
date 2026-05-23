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

  if (isLoading) return <div style={{ padding: '20px' }}>Loading...</div>

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '23px', fontWeight: 400, margin: 0 }}>Custom Fields</h1>
        <div>
          <button 
            onClick={addGroup}
            style={{ border: '1px solid #2271b1', color: '#2271b1', background: 'white', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer', marginRight: '10px' }}
          >
            Add New Group
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            style={{ backgroundColor: '#2271b1', color: 'white', border: 'none', padding: '5px 12px', borderRadius: '3px', cursor: isSaving ? 'not-allowed' : 'pointer' }}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div style={{ backgroundColor: 'white', padding: '40px', textAlign: 'center', border: '1px solid #c3c4c7', color: '#646970' }}>
          No Field Groups found. Click &quot;Add New Group&quot; to create one.
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.id} style={{ backgroundColor: 'white', border: '1px solid #c3c4c7', marginBottom: '20px', boxShadow: '0 1px 1px rgba(0,0,0,.04)' }}>
            <div style={{ padding: '15px', borderBottom: '1px solid #f0f0f1', display: 'flex', justifyContent: 'space-between', backgroundColor: '#fcfcfc' }}>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <input 
                  type="text" 
                  value={group.title} 
                  onChange={(e) => updateGroup(group.id, 'title', e.target.value)}
                  style={{ fontSize: '16px', fontWeight: 600, padding: '4px 8px', border: '1px solid #8c8f94', width: '250px' }}
                />
                <select 
                  value={group.postType}
                  onChange={(e) => updateGroup(group.id, 'postType', e.target.value)}
                  style={{ padding: '5px', border: '1px solid #8c8f94' }}
                >
                  <option value="post">Show on Posts</option>
                  <option value="page">Show on Pages</option>
                </select>
              </div>
              <button 
                onClick={() => removeGroup(group.id)}
                style={{ color: '#d63638', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Delete Group
              </button>
            </div>

            <div style={{ padding: '15px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f0f0f1', textAlign: 'left', color: '#646970', fontSize: '13px' }}>
                    <th style={{ padding: '8px', width: '30%' }}>Field Label</th>
                    <th style={{ padding: '8px', width: '30%' }}>Field Name (DB Key)</th>
                    <th style={{ padding: '8px', width: '30%' }}>Field Type</th>
                    <th style={{ padding: '8px', width: '10%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {group.fields.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '15px', textAlign: 'center', color: '#8c8f94' }}>No fields in this group.</td>
                    </tr>
                  ) : (
                    group.fields.map((field, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f0f0f1' }}>
                        <td style={{ padding: '8px' }}>
                          <input 
                            type="text" 
                            value={field.label}
                            onChange={(e) => updateField(group.id, idx, 'label', e.target.value)}
                            style={{ width: '100%', padding: '4px', border: '1px solid #8c8f94' }}
                          />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <input 
                            type="text" 
                            value={field.name}
                            onChange={(e) => updateField(group.id, idx, 'name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                            style={{ width: '100%', padding: '4px', border: '1px solid #8c8f94', backgroundColor: '#f0f0f1' }}
                          />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <select 
                            value={field.type}
                            onChange={(e) => updateField(group.id, idx, 'type', e.target.value)}
                            style={{ width: '100%', padding: '4px', border: '1px solid #8c8f94' }}
                          >
                            <option value="text">Text</option>
                            <option value="textarea">Textarea</option>
                            <option value="number">Number</option>
                            <option value="url">URL</option>
                          </select>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <button 
                            onClick={() => removeField(group.id, idx)}
                            style={{ color: '#d63638', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                            title="Remove field"
                          >
                            &times;
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div style={{ textAlign: 'right' }}>
                <button 
                  onClick={() => addField(group.id)}
                  style={{ border: '1px solid #2271b1', color: '#2271b1', background: 'white', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer' }}
                >
                  + Add Field
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
