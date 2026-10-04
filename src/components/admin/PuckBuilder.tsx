"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Puck, Data } from "@measured/puck";
import type { Config } from "@measured/puck";
import "@measured/puck/puck.css";
import { puckConfig } from "@/lib/puck/config";
import { getClientPuckConfig } from "@/lib/puck/client-config";
import { createClientPuckConfig } from "@/lib/puck/client-mode";
import type { BuilderEditMode, BuilderTargetRef } from "@/modules/builder-collaboration/domain";
import type { BuilderDocument } from "@/lib/puck/types";
import BuilderCollaborationPanel, {
  type BuilderCommentSummary,
  type BuilderRevisionSummary,
} from "./BuilderCollaborationPanel";
import {
  createBuilderDocument,
  createEmptyBuilderDocument,
  parseBuilderDocument,
  serializeBuilderDocument,
  validateBuilderComponents,
} from "@/lib/puck/document";
import { validateBuilderLayoutDocument } from "@/lib/puck/layout/schema";
import { isBuilderPublishAllowed } from "@/lib/puck/publish";

const darkPuckStyles = `
  /* Isolate Puck from Tailwind Preflight */
  .puck-wrapper {
    height: 700px;
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.1);
    background: #fff; /* Puck is natively light theme */
    color: #000;
  }
  
  /* Reset Tailwind borders that break third-party UIs */
  .puck-wrapper *, .puck-wrapper ::before, .puck-wrapper ::after {
    border-style: none;
    border-width: 0;
  }

  /* Reset lists and headings */
  .puck-wrapper ul, .puck-wrapper ol {
    list-style: revert;
    margin: revert;
    padding: revert;
  }
  
  .puck-wrapper h1, .puck-wrapper h2, .puck-wrapper h3, .puck-wrapper h4, .puck-wrapper h5, .puck-wrapper h6 {
    font-size: revert;
    font-weight: revert;
    margin: revert;
  }
`;

interface PuckBuilderProps {
  initialData: string | object;
  onPublish: (serialized: string) => void;
  collaborationTarget?: BuilderTargetRef;
  mode?: BuilderEditMode;
  onVersionChange?: (version: number) => void;
}

type CollaborationState = {
  targetId: string
  version: number
  capabilities: readonly string[]
  document: object
  revisions: BuilderRevisionSummary[]
  comments: BuilderCommentSummary[]
}

type CollaborationResponse = CollaborationState & {
  error?: string
  revision?: BuilderRevisionSummary
}

export default function PuckBuilder({
  initialData,
  onPublish,
  collaborationTarget,
  mode = 'editor',
  onVersionChange,
}: PuckBuilderProps) {
  const [config, setConfig] = useState<Config<any>>(
    mode === 'client' ? createClientPuckConfig(puckConfig) : puckConfig,
  )
  const [collaboration, setCollaboration] = useState<CollaborationState | null>(null)
  const [collaborationError, setCollaborationError] = useState<string | null>(null)
  const [collaborationConflict, setCollaborationConflict] = useState<string | null>(null)
  const collaborationDocument = collaboration?.document ?? initialData
  const parsedInitialData = useMemo(() => parseBuilderDocument(collaborationDocument), [collaborationDocument])
  const document = useMemo(() => {
    if (parsedInitialData.kind === 'puck') return parsedInitialData.document

    console.warn('Puck builder received incompatible initial content', parsedInitialData.kind)
    return createEmptyBuilderDocument()
  }, [parsedInitialData])
  const initialDiagnostic = parsedInitialData.kind === 'invalid'
    ? parsedInitialData.reason
    : undefined
  const canPublish = isBuilderPublishAllowed(initialData, new Set(Object.keys(config.components)))
  const invalidLayout = parsedInitialData.kind === 'puck'
    && !validateBuilderLayoutDocument(parsedInitialData.document).valid

  const unknownComponents = useMemo(() => {
    const validation = validateBuilderComponents(document, new Set(Object.keys(config.components)))
    return validation.valid ? [] : validation.unknownTypes
  }, [config, document])

  const collaborationUrl = collaborationTarget
    ? `/api/admin/builder/targets/${collaborationTarget.type}/${encodeURIComponent(collaborationTarget.key)}`
    : null

  const loadCollaboration = useCallback(async () => {
    if (!collaborationTarget || !collaborationUrl) return

    setCollaborationError(null)
    const targetResponse = await fetch(collaborationUrl)
    if (!targetResponse.ok) throw new Error(`Falha ao carregar Builder (${targetResponse.status})`)
    const target = await targetResponse.json() as CollaborationState
    const capabilities = target.capabilities ?? []
    const [revisions, comments] = await Promise.all([
      capabilities.includes('builder.history.read')
        ? fetch(`${collaborationUrl}/revisions`).then(async (response) => response.ok ? response.json() : [])
        : Promise.resolve([]),
      capabilities.includes('builder.comments.read')
        ? fetch(`${collaborationUrl}/comments`).then(async (response) => response.ok ? response.json() : [])
        : Promise.resolve([]),
    ])

    setCollaboration({
      targetId: target.targetId,
      version: target.version,
      capabilities,
      document: target.document,
      revisions,
      comments,
    })
    setCollaborationConflict(null)
    onVersionChange?.(target.version)
  }, [collaborationTarget, collaborationUrl, onVersionChange])

  useEffect(() => {
    let mounted = true

    getClientPuckConfig()
      .then((resolvedConfig) => {
        if (mounted) setConfig(mode === 'client' ? createClientPuckConfig(resolvedConfig) : resolvedConfig)
      })
      .catch((error) => {
        console.error("Failed to load plugin Puck components:", error)
      })

    return () => {
      mounted = false
    }
  }, [mode])

  useEffect(() => {
    if (!collaborationTarget) return
    let mounted = true
    const timer = setTimeout(() => {
      loadCollaboration().catch((error) => {
        if (mounted) setCollaborationError(error instanceof Error ? error.message : 'Falha ao carregar colaboração')
      })
    }, 0)
    return () => {
      mounted = false
      clearTimeout(timer)
    }
  }, [collaborationTarget, loadCollaboration])

  async function publishDocument(serialized: string) {
    if (!collaborationTarget) {
      onPublish(serialized)
      return
    }
    if (!collaboration || !collaborationUrl) {
      setCollaborationError('A versão colaborativa ainda está carregando.')
      return
    }

    try {
      const response = await fetch(collaborationUrl, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          document: JSON.parse(serialized),
          expectedVersion: collaboration.version,
          mode,
        }),
      })
      const payload = await response.json() as CollaborationResponse
      if (response.status === 409) {
        setCollaborationConflict(payload.error ?? 'O documento foi alterado por outra pessoa. Recarregue antes de salvar novamente.')
        return
      }
      if (!response.ok) throw new Error(payload.error ?? `Falha ao salvar Builder (${response.status})`)

      setCollaboration((current) => current ? {
        ...current,
        version: payload.version,
        document: payload.document,
        revisions: payload.revision ? [payload.revision, ...current.revisions] : current.revisions,
      } : current)
      setCollaborationConflict(null)
      setCollaborationError(null)
      onVersionChange?.(payload.version)
      onPublish(serializeBuilderDocument(payload.document as BuilderDocument))
    } catch (error) {
      setCollaborationError(error instanceof Error ? error.message : 'Falha ao salvar Builder')
    }
  }

  async function restoreRevision(revisionId: string) {
    if (!collaboration || !collaborationUrl) return
    try {
      const response = await fetch(`${collaborationUrl}/restore`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ revisionId, expectedVersion: collaboration.version }),
      })
      const payload = await response.json() as CollaborationResponse
      if (response.status === 409) {
        setCollaborationConflict(payload.error ?? 'A versão mudou enquanto a restauração era preparada.')
        return
      }
      if (!response.ok) throw new Error(payload.error ?? `Falha ao restaurar (${response.status})`)
      await loadCollaboration()
      onPublish(serializeBuilderDocument(payload.document as BuilderDocument))
    } catch (error) {
      setCollaborationError(error instanceof Error ? error.message : 'Falha ao restaurar revisão')
    }
  }

  async function createComment(body: string) {
    if (!collaborationUrl) return
    const response = await fetch(`${collaborationUrl}/comments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body }),
    })
    if (!response.ok) throw new Error('Falha ao adicionar comentário')
    await loadCollaboration()
  }

  async function resolveComment(commentId: string, status: 'open' | 'resolved') {
    if (!collaborationUrl) return
    const response = await fetch(`${collaborationUrl}/comments/${encodeURIComponent(commentId)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!response.ok) throw new Error('Falha ao atualizar comentário')
    await loadCollaboration()
  }

  return (
    <div className="w-full">
      <style>{darkPuckStyles}</style>
      <div className="puck-wrapper w-full flex flex-col">
        {collaborationError && (
          <div className="bg-red-100 px-4 py-2 text-sm text-red-950" role="status">
            {collaborationError}
          </div>
        )}
        {unknownComponents.length > 0 && (
          <div className="bg-amber-100 px-4 py-2 text-sm text-amber-950" role="status">
            Componentes indisponíveis: {unknownComponents.join(', ')}
          </div>
        )}
        {!canPublish && (
          <div className="bg-red-100 px-4 py-2 text-sm text-red-950" role="status">
            {initialDiagnostic
              ? `Documento inválido: ${initialDiagnostic}. `
              : invalidLayout
              ? 'O layout contém valores inválidos; a publicação está bloqueada até a correção.'
              : 'O conteúdo inicial é incompatível; a publicação está bloqueada para preservar a versão publicada.'}
            {!initialDiagnostic && !invalidLayout && ' A publicação está bloqueada para preservar a versão publicada.'}
          </div>
        )}
        <Puck
          config={config}
          data={document as Data}
          onPublish={(data) => {
            if (!canPublish) return

            const canonicalDocument = createBuilderDocument({
              content: data.content,
              root: data.root,
            })
            void publishDocument(serializeBuilderDocument(canonicalDocument))
          }}
        />
      </div>
      {collaboration && collaborationTarget && (
        <BuilderCollaborationPanel
          target={collaborationTarget}
          version={collaboration.version}
          capabilities={collaboration.capabilities}
          revisions={collaboration.revisions}
          comments={collaboration.comments}
          conflict={collaborationConflict}
          onReload={() => loadCollaboration()}
          onRestore={restoreRevision}
          onResolveComment={resolveComment}
          onCreateComment={createComment}
        />
      )}
    </div>
  );
}
