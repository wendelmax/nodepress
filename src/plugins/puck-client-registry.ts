import type { PuckComponentSource } from '@/lib/puck/components'

// Only modules safe for the browser belong in this allowlist. Server-only
// plugin manifests stay in src/plugins/registry.ts.
export const clientPuckPlugins: PuckComponentSource[] = []
