"use client"

import { useState, useEffect, useCallback } from "react"

export interface Term {
  id: number
  name: string
  slug: string
  description: string
  count: number
}

export function useTaxonomies(taxonomy: 'category' | 'post_tag') {
  const [terms, setTerms] = useState<Term[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  const apiRoute = taxonomy === 'category' ? '/api/categories' : '/api/tags'

  const fetchTerms = useCallback(async () => {
    await Promise.resolve()
    setIsLoading(true)
    try {
      const res = await fetch(apiRoute)
      const data = await res.json()
      if (Array.isArray(data)) {
        setTerms(data)
      }
    } catch (error) {
      console.error("Failed to fetch terms", error)
    } finally {
      setIsLoading(false)
    }
  }, [apiRoute])

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchTerms()
    })
  }, [fetchTerms])

  const createTerm = async (name: string, slug: string, description: string) => {
    setIsSaving(true)
    try {
      const res = await fetch(apiRoute, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, description })
      })
      
      if (res.ok) {
        const newTerm = await res.json()
        setTerms(prev => [...prev, newTerm])
        return true
      }
      return false
    } catch (error) {
      console.error("Failed to create term", error)
      return false
    } finally {
      setIsSaving(false)
    }
  }

  return {
    terms,
    isLoading,
    isSaving,
    createTerm,
    refreshTerms: fetchTerms
  }
}
