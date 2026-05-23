"use client"

import { useRef, useState, useEffect } from "react"
import MediaSelectorModal from "./MediaSelectorModal"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false)

  // Sincronizar valor inicial (mas evitar re-renders na digitação)
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || ""
    }
  }, [value])

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const execCmd = (command: string, arg?: string) => {
    document.execCommand(command, false, arg)
    if (editorRef.current) {
      editorRef.current.focus()
      handleInput()
    }
  }

  const handleInsertMedia = (url: string, alt: string) => {
    const imgHtml = `<img src="${url}" alt="${alt}" style="max-width: 100%; height: auto;" />`
    execCmd('insertHTML', imgHtml)
    setIsMediaModalOpen(false)
  }

  const btnStyle = {
    background: 'none',
    border: '1px solid transparent',
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#2c3338',
    borderRadius: '3px',
  }

  return (
    <div style={{ border: '1px solid #8c8f94', borderRadius: '3px', backgroundColor: 'white', display: 'flex', flexDirection: 'column' }}>
      
      {/* Toolbar */}
      <div style={{ 
        display: 'flex', 
        gap: '5px', 
        padding: '8px', 
        borderBottom: '1px solid #8c8f94', 
        backgroundColor: '#f0f0f1',
        flexWrap: 'wrap'
      }}>
        <button type="button" onClick={() => execCmd('bold')} style={{...btnStyle, fontWeight: 'bold'}} title="Bold">B</button>
        <button type="button" onClick={() => execCmd('italic')} style={{...btnStyle, fontStyle: 'italic'}} title="Italic">I</button>
        <button type="button" onClick={() => execCmd('underline')} style={{...btnStyle, textDecoration: 'underline'}} title="Underline">U</button>
        
        <div style={{ width: '1px', backgroundColor: '#c3c4c7', margin: '0 5px' }}></div>
        
        <button type="button" onClick={() => execCmd('formatBlock', 'H2')} style={btnStyle} title="Heading 2">H2</button>
        <button type="button" onClick={() => execCmd('formatBlock', 'H3')} style={btnStyle} title="Heading 3">H3</button>
        <button type="button" onClick={() => execCmd('formatBlock', 'P')} style={btnStyle} title="Paragraph">P</button>

        <div style={{ width: '1px', backgroundColor: '#c3c4c7', margin: '0 5px' }}></div>
        
        <button type="button" onClick={() => execCmd('insertUnorderedList')} style={btnStyle} title="Bulleted List">• List</button>
        <button type="button" onClick={() => execCmd('insertOrderedList')} style={btnStyle} title="Numbered List">1. List</button>
        
        <div style={{ width: '1px', backgroundColor: '#c3c4c7', margin: '0 5px' }}></div>
        
        <button type="button" onClick={() => {
          const url = prompt('Enter link URL:')
          if (url) execCmd('createLink', url)
        }} style={btnStyle} title="Insert Link">🔗 Link</button>

        <div style={{ flex: 1 }}></div>

        <button 
          type="button" 
          onClick={() => setIsMediaModalOpen(true)} 
          style={{...btnStyle, backgroundColor: '#2271b1', color: 'white'}}
        >
          🖼️ Add Media
        </button>
      </div>

      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        style={{
          padding: '15px',
          minHeight: '400px',
          outline: 'none',
          lineHeight: '1.6',
          fontSize: '16px',
          color: '#3c434a',
          overflowY: 'auto'
        }}
        data-placeholder={placeholder}
      />

      <MediaSelectorModal 
        isOpen={isMediaModalOpen} 
        onClose={() => setIsMediaModalOpen(false)} 
        onSelect={handleInsertMedia} 
      />
    </div>
  )
}
