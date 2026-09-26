"use client";

import { useEffect, useMemo, useState } from "react";
import { Puck, Data } from "@measured/puck";
import type { Config } from "@measured/puck";
import "@measured/puck/puck.css";
import { puckConfig } from "@/lib/puck/config";
import { getClientPuckConfig } from "@/lib/puck/client-config";
import {
  canPublishBuilderDocument,
  createBuilderDocument,
  createEmptyBuilderDocument,
  parseBuilderDocument,
  serializeBuilderDocument,
  validateBuilderComponents,
} from "@/lib/puck/document";

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
}

export default function PuckBuilder({ initialData, onPublish }: PuckBuilderProps) {
  const [config, setConfig] = useState<Config<any>>(puckConfig)
  const parsedInitialData = useMemo(() => parseBuilderDocument(initialData), [initialData])
  const document = useMemo(() => {
    if (parsedInitialData.kind === 'puck') return parsedInitialData.document

    console.warn('Puck builder received incompatible initial content', parsedInitialData.kind)
    return createEmptyBuilderDocument()
  }, [parsedInitialData])
  const canPublish = canPublishBuilderDocument(initialData)

  const unknownComponents = useMemo(() => {
    const validation = validateBuilderComponents(document, new Set(Object.keys(config.components)))
    return validation.valid ? [] : validation.unknownTypes
  }, [config, document])

  useEffect(() => {
    let mounted = true

    getClientPuckConfig()
      .then((resolvedConfig) => {
        if (mounted) setConfig(resolvedConfig)
      })
      .catch((error) => {
        console.error("Failed to load plugin Puck components:", error)
      })

    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="puck-wrapper w-full flex flex-col">
      <style>{darkPuckStyles}</style>
      {unknownComponents.length > 0 && (
        <div className="bg-amber-100 px-4 py-2 text-sm text-amber-950" role="status">
          Componentes indisponíveis: {unknownComponents.join(', ')}
        </div>
      )}
      {!canPublish && (
        <div className="bg-red-100 px-4 py-2 text-sm text-red-950" role="status">
          O conteúdo inicial é incompatível; a publicação está bloqueada para preservar a versão publicada.
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
          onPublish(serializeBuilderDocument(canonicalDocument))
        }}
      />
    </div>
  );
}
