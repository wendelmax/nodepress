"use client"

import React, { useEffect, useRef } from 'react'
import EditorJS, { OutputData } from '@editorjs/editorjs'
// @ts-ignore
import Header from '@editorjs/header'
// @ts-ignore
import List from '@editorjs/list'
// @ts-ignore
import ImageTool from '@editorjs/image'

interface BlockEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export default function BlockEditor({ value, onChange, placeholder }: BlockEditorProps) {
  const editorRef = useRef<EditorJS | null>(null)
  const holderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!editorRef.current && holderRef.current) {
      let initialData: OutputData | undefined

      try {
        if (value && value.trim().startsWith('{')) {
          initialData = JSON.parse(value)
        } else if (value) {
          // Legacy HTML fallback: we insert it as a raw paragraph block
          initialData = {
            time: new Date().getTime(),
            blocks: [
              {
                type: 'paragraph',
                data: {
                  text: value
                }
              }
            ],
            version: '2.30.0'
          }
        }
      } catch (e) {
        console.warn('Failed to parse initial data for BlockEditor', e)
      }

      const editor = new EditorJS({
        holder: holderRef.current,
        placeholder: placeholder || 'Start writing...',
        data: initialData,
        tools: {
          header: {
            class: Header,
            inlineToolbar: true,
            config: {
              levels: [2, 3, 4],
              defaultLevel: 2
            }
          },
          list: {
            class: List,
            inlineToolbar: true,
          },
          image: {
            class: ImageTool,
            config: {
              endpoints: {
                byFile: '/api/media', // Your backend file uploader endpoint
              }
            }
          }
        },
        onChange: async () => {
          try {
            const data = await editor.save()
            onChange(JSON.stringify(data))
          } catch (e) {
            console.error('Failed to save BlockEditor data', e)
          }
        }
      })

      editorRef.current = editor
    }

    return () => {
      if (editorRef.current && editorRef.current.destroy) {
        editorRef.current.destroy()
        editorRef.current = null
      }
    }
  }, [])

  return (
    <div 
      style={{ 
        border: '1px solid #c3c4c7', 
        minHeight: '400px', 
        padding: '20px', 
        backgroundColor: 'white',
        borderRadius: '3px',
        fontSize: '16px',
        fontFamily: 'system-ui, sans-serif'
      }}
    >
      <div ref={holderRef} id="editorjs" />
    </div>
  )
}
