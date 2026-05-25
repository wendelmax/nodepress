"use client"

import { useState, useEffect, useCallback } from "react"
import { ArrowUp, ArrowDown, Trash2 } from "lucide-react"
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
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      
      {/* Left Column: Select / Create Menu & Add Items */}
      <div className="w-full lg:w-[320px] flex flex-col gap-6 shrink-0">
        
        {/* Menu Selector */}
        <div className="bg-background-secondary border border-border p-5 rounded-2xl shadow-soft">
          <h3 className="text-sm font-semibold text-text mb-3">Select a Menu</h3>
          <select 
            value={selectedMenuId || ""} 
            onChange={(e) => setSelectedMenuId(Number(e.target.value))}
            className="w-full px-3 py-2 bg-background-tertiary border border-border rounded-xl text-sm text-text focus:outline-none focus:border-primary/50 transition-colors mb-4"
          >
            {menus.length === 0 && <option value="">No menus found</option>}
            {menus.map(m => (
              <option key={m.id} value={m.id}>{m.name} ({m.slug})</option>
            ))}
          </select>

          <hr className="border-border/60 my-5" />
          
          <h3 className="text-sm font-semibold text-text mb-3">Create New Menu</h3>
          <form onSubmit={handleCreateMenu} className="flex gap-2">
            <input 
              type="text" 
              placeholder="Menu Name" 
              value={newMenuName} 
              onChange={e => setNewMenuName(e.target.value)} 
              className="flex-1 px-3 py-2 bg-background-tertiary border border-border rounded-xl text-sm text-text placeholder-text-muted focus:outline-none focus:border-primary/50 transition-colors"
            />
            <button type="submit" className="px-4 py-2 bg-primary/10 text-primary-light border border-primary/20 hover:bg-primary/20 rounded-xl text-sm font-semibold transition-all">
              Create
            </button>
          </form>
        </div>

        {/* Add Link */}
        {selectedMenuId && (
          <div className="bg-background-secondary border border-border p-5 rounded-2xl shadow-soft">
            <h3 className="text-sm font-semibold text-text mb-4">Add Custom Link</h3>
            <form onSubmit={handleAddLink} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">URL</label>
                <input 
                  type="url" 
                  value={linkUrl} 
                  onChange={e => setLinkUrl(e.target.value)} 
                  placeholder="https://" 
                  required 
                  className="w-full px-3 py-2 bg-background-tertiary border border-border rounded-xl text-sm text-text placeholder-text-muted focus:outline-none focus:border-primary/50 transition-colors" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">Link Text</label>
                <input 
                  type="text" 
                  value={linkTitle} 
                  onChange={e => setLinkTitle(e.target.value)} 
                  placeholder="Menu Item" 
                  required 
                  className="w-full px-3 py-2 bg-background-tertiary border border-border rounded-xl text-sm text-text placeholder-text-muted focus:outline-none focus:border-primary/50 transition-colors" 
                />
              </div>
              <div className="text-right mt-2">
                <button type="submit" className="px-4 py-2 bg-primary-gradient text-white rounded-xl text-sm font-semibold hover:shadow-neon transition-all">
                  Add to Menu
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Right Column: Menu Items Structure */}
      <div className="flex-1 w-full bg-background-secondary border border-border p-6 md:p-8 rounded-2xl shadow-soft">
        <h2 className="text-xl font-bold text-white mb-6">Menu Structure</h2>
        {!selectedMenuId ? (
          <p className="text-sm text-text-muted">Select or create a menu to start editing.</p>
        ) : isLoading ? (
          <p className="text-sm text-text-muted flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
            Loading items...
          </p>
        ) : items.length === 0 ? (
          <p className="text-sm text-text-muted">This menu has no items. Add some using the sidebar.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item, index) => (
              <div key={item.id} className="flex items-center justify-between bg-background border border-border p-4 rounded-xl group hover:border-primary/30 transition-colors">
                <div>
                  <strong className="text-sm font-semibold text-text group-hover:text-primary-light transition-colors">{item.title}</strong>
                  <div className="text-xs text-text-muted mt-1">{item.url}</div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleMove(index, 'up')} 
                    disabled={index === 0}
                    className={`p-1.5 rounded-lg border flex items-center justify-center transition-colors ${index === 0 ? 'border-border/50 text-border bg-transparent cursor-not-allowed' : 'border-border text-text-secondary hover:bg-white/5 hover:text-white cursor-pointer'}`}
                    title="Move Up"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button 
                    onClick={() => handleMove(index, 'down')} 
                    disabled={index === items.length - 1}
                    className={`p-1.5 rounded-lg border flex items-center justify-center transition-colors ${index === items.length - 1 ? 'border-border/50 text-border bg-transparent cursor-not-allowed' : 'border-border text-text-secondary hover:bg-white/5 hover:text-white cursor-pointer'}`}
                    title="Move Down"
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1.5 rounded-lg border border-danger/30 text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                    title="Remove"
                  >
                    <Trash2 size={16} />
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
