"use client"

import { useRef, useState, useEffect } from "react"
import { Link as LinkIcon, Image as ImageIcon } from "lucide-react"
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

  const btnClass = "bg-transparent border border-transparent px-2.5 py-1.5 cursor-pointer text-sm text-text-secondary rounded-lg hover:bg-white/10 hover:text-white transition-colors"

  return (
    <div className="flex flex-col border border-border rounded-xl bg-surface-elevated overflow-hidden shadow-soft">
      
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 p-2.5 border-b border-border bg-white/[0.02]">
        <button type="button" onClick={() => execCmd('bold')} className={`${btnClass} font-bold`} title="Bold">B</button>
        <button type="button" onClick={() => execCmd('italic')} className={`${btnClass} italic`} title="Italic">I</button>
        <button type="button" onClick={() => execCmd('underline')} className={`${btnClass} underline`} title="Underline">U</button>
        
        <div className="w-px h-5 bg-border mx-1.5"></div>
        
        <button type="button" onClick={() => execCmd('formatBlock', 'H2')} className={btnClass} title="Heading 2">H2</button>
        <button type="button" onClick={() => execCmd('formatBlock', 'H3')} className={btnClass} title="Heading 3">H3</button>
        <button type="button" onClick={() => execCmd('formatBlock', 'P')} className={btnClass} title="Paragraph">P</button>

        <div className="w-px h-5 bg-border mx-1.5"></div>
        
        <button type="button" onClick={() => execCmd('insertUnorderedList')} className={btnClass} title="Bulleted List">• List</button>
        <button type="button" onClick={() => execCmd('insertOrderedList')} className={btnClass} title="Numbered List">1. List</button>
        
        <div className="w-px h-5 bg-border mx-1.5"></div>
        
        <button type="button" onClick={() => {
          const url = prompt('Enter link URL:')
          if (url) execCmd('createLink', url)
        }} className={`${btnClass} flex flex-row items-center gap-1`} title="Insert Link"><LinkIcon size={14}/> Link</button>

        <div className="flex-1"></div>

        <button 
          type="button" 
          onClick={() => setIsMediaModalOpen(true)} 
          className="px-3 py-1.5 bg-primary/10 text-primary-light hover:bg-primary/20 border border-primary/20 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5"
        >
          <ImageIcon size={16} /> <span className="hidden sm:inline">Add Media</span>
        </button>
      </div>

      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        className="p-4 md:p-6 min-h-[400px] outline-none leading-relaxed text-base text-text overflow-y-auto prose prose-invert prose-blue max-w-none prose-p:text-text-secondary"
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
