"use client"

import { useState, useEffect, useCallback } from "react"

interface Menu {
  id: number;
  name: string;
  slug: string;
}

interface MenuItem {
  id: number;
  title: string;
  url: string;
  order: number;
}

export default function MenuEditor({ initialMenus }: { initialMenus: Menu[] }) {
  const [menus, setMenus] = useState<Menu[]>(initialMenus)
  const [selectedMenuId, setSelectedMenuId] = useState<number | null>(menus.length > 0 ? menus[0].id : null)
  const [newMenuName, setNewMenuName] = useState("")

  const [items, setItems] = useState<MenuItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Custom link form
  const [linkTitle, setLinkTitle] = useState("")
  const [linkUrl, setLinkUrl] = useState("")

  const loadMenuItems = useCallback(async (menuId: number) => {
    setIsLoading(true)
    const menu = menus.find(m => m.id === menuId)
    if (menu) {
      const res = await fetch(`/api/menus/${menu.slug}/items`)
      if (res.ok) {
        const data = await res.json()
        setItems(data)
      }
    }
    setIsLoading(false)
  }, [menus])

  useEffect(() => {
    if (selectedMenuId) {
      Promise.resolve().then(() => {
        loadMenuItems(selectedMenuId)
      })
    } else {
      Promise.resolve().then(() => {
        setItems([])
      })
    }
  }, [selectedMenuId, loadMenuItems])

  const handleCreateMenu = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMenuName) return
    const res = await fetch('/api/menus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newMenuName })
    })
    if (res.ok) {
      const newMenu = await res.json()
      setMenus([...menus, newMenu])
      setSelectedMenuId(newMenu.id)
      setNewMenuName("")
    }
  }

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMenuId || !linkTitle || !linkUrl) return

    const res = await fetch(`/api/menus/${selectedMenuId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: linkTitle, url: linkUrl, order: items.length })
    })

    if (res.ok) {
      const newItem = await res.json()
      setItems([...items, newItem])
      setLinkTitle("")
      setLinkUrl("")
    }
  }

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm("Remove this item?")) return
    const res = await fetch(`/api/menus/items/${itemId}`, { method: 'DELETE' })
    if (res.ok) {
      setItems(items.filter(i => i.id !== itemId))
    }
  }

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === items.length - 1) return

    const newItems = [...items]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    
    // Swap
    const temp = newItems[index]
    newItems[index] = newItems[swapIndex]
    newItems[swapIndex] = temp

    // Update local state immediately for fast feedback
    setItems(newItems)

    // Save order to server
    const orderedIds = newItems.map(item => item.id)
    await fetch(`/api/menus/${selectedMenuId}/items`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds })
    })
  }

  return (
    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
      
      {/* Left Column: Select / Create Menu & Add Items */}
      <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Menu Selector */}
        <div style={{ backgroundColor: 'white', padding: '15px', border: '1px solid #c3c4c7', borderRadius: '3px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Select a Menu</h3>
          <select 
            value={selectedMenuId || ""} 
            onChange={(e) => setSelectedMenuId(Number(e.target.value))}
            style={{ width: '100%', padding: '6px', marginBottom: '10px' }}
          >
            {menus.length === 0 && <option value="">No menus found</option>}
            {menus.map(m => (
              <option key={m.id} value={m.id}>{m.name} ({m.slug})</option>
            ))}
          </select>

          <hr style={{ border: 0, borderTop: '1px solid #eee', margin: '15px 0' }} />
          
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Create New Menu</h3>
          <form onSubmit={handleCreateMenu} style={{ display: 'flex', gap: '5px' }}>
            <input 
              type="text" 
              placeholder="Menu Name" 
              value={newMenuName} 
              onChange={e => setNewMenuName(e.target.value)} 
              style={{ flex: 1, padding: '4px 8px' }} 
            />
            <button type="submit" style={{ padding: '4px 10px', background: '#f6f7f7', border: '1px solid #2271b1', color: '#2271b1', cursor: 'pointer' }}>Create</button>
          </form>
        </div>

        {/* Add Link */}
        {selectedMenuId && (
          <div style={{ backgroundColor: 'white', padding: '15px', border: '1px solid #c3c4c7', borderRadius: '3px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Add Custom Link</h3>
            <form onSubmit={handleAddLink} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#646970' }}>URL</label>
                <input type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://" required style={{ width: '100%', padding: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#646970' }}>Link Text</label>
                <input type="text" value={linkTitle} onChange={e => setLinkTitle(e.target.value)} placeholder="Menu Item" required style={{ width: '100%', padding: '6px' }} />
              </div>
              <div style={{ textAlign: 'right' }}>
                <button type="submit" style={{ padding: '6px 12px', background: '#f6f7f7', border: '1px solid #2271b1', color: '#2271b1', cursor: 'pointer', borderRadius: '3px' }}>Add to Menu</button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Right Column: Menu Items Structure */}
      <div style={{ flex: 1, backgroundColor: 'white', padding: '20px', border: '1px solid #c3c4c7', borderRadius: '3px' }}>
        <h2 style={{ fontSize: '18px', margin: '0 0 20px 0' }}>Menu Structure</h2>
        {!selectedMenuId ? (
          <p style={{ color: '#646970' }}>Select or create a menu to start editing.</p>
        ) : isLoading ? (
          <p style={{ color: '#646970' }}>Loading items...</p>
        ) : items.length === 0 ? (
          <p style={{ color: '#646970' }}>This menu has no items. Add some using the sidebar.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {items.map((item, index) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fcfcfc', border: '1px solid #dcdcde', padding: '10px 15px', borderRadius: '3px' }}>
                <div>
                  <strong>{item.title}</strong>
                  <div style={{ fontSize: '12px', color: '#646970', marginTop: '4px' }}>{item.url}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => handleMove(index, 'up')} 
                    disabled={index === 0}
                    style={{ background: 'none', border: '1px solid #ccc', padding: '4px 8px', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.3 : 1 }}
                  >
                    ⬆️
                  </button>
                  <button 
                    onClick={() => handleMove(index, 'down')} 
                    disabled={index === items.length - 1}
                    style={{ background: 'none', border: '1px solid #ccc', padding: '4px 8px', cursor: index === items.length - 1 ? 'default' : 'pointer', opacity: index === items.length - 1 ? 0.3 : 1 }}
                  >
                    ⬇️
                  </button>
                  <button 
                    onClick={() => handleDeleteItem(item.id)}
                    style={{ background: 'none', border: '1px solid #d63638', color: '#d63638', padding: '4px 8px', cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
