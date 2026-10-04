# NodePress Plugin SDK

NodePress plugins extend the platform through a typed `PluginContext`. A plugin must declare the capabilities it needs in `permissions`; undeclared capabilities fail at runtime.

## Configuration

```ts
const plugin: NodePressPlugin = {
  id: 'acme-reports',
  name: 'Acme Reports',
  version: '1.0.0',
  permissions: ['settings.read', 'settings.write', 'secrets.read', 'secrets.write', 'slots.register'],
  settings: [
    { id: 'enabled', label: 'Enabled', type: 'boolean', defaultValue: true },
    { id: 'mode', label: 'Mode', type: 'select', options: ['safe', 'fast'], defaultValue: 'safe' },
  ],
  secrets: [{ id: 'apiToken', label: 'API token' }],
  register: async ({ settings, secrets }) => {
    const enabled = await settings.get<boolean>('enabled')
    if (enabled) await secrets.set('apiToken', 'provided-by-admin')
  },
}
```

Settings are persisted through the plugin namespace and support text, number, boolean, select and JSON values. The storage key reserves a tenant segment, so callers can pass a tenant id when the host supplies tenant-scoped context. `getAll()` redacts settings marked with `secret: true` by default.

Secrets are stored separately and encrypted with AES-256-GCM. Configure `NODEPRESS_PLUGIN_SECRETS_KEY` in production; `AUTH_SECRET` or `NEXTAUTH_SECRET` are accepted as fallbacks. Secret values never appear in settings snapshots, plugin status, logs or admin page payloads.

## Slots and settings pages

```ts
register({ slots, adminPages }) {
  slots.register({
    id: 'reports.dashboard',
    surface: 'admin',
    render: (props) => <ReportsWidget filter={props.filter} />,
  })

  adminPages.register({
    slug: 'acme-reports-settings',
    label: 'Reports settings',
    render: () => <ReportsSettings />,
  })
}
```

Slot and page registration returns a cleanup callback and is automatically removed when the plugin is deactivated. The host can render a slot with `renderPluginSlot(surface, id, props)`. Admin pages use the existing `/admin/plugins/:slug` route and hook contract.

## Lifecycle and health

Existing `install`, migration, activation, deactivation and uninstall orchestration remains owned by `PluginService`. Plugins can expose a safe health callback:

```ts
health: async () => ({ status: 'healthy', message: 'Provider reachable' })
```

`PluginService.getStatus(id)` returns active state, engine compatibility and health. Exceptions become an `unhealthy` result with a generic message so provider credentials cannot leak.

## Capability reference

| Capability | Grants |
| --- | --- |
| `settings.read` | Read definitions and values |
| `settings.write` | Write settings |
| `secrets.read` | Read or check secrets |
| `secrets.write` | Write or delete secrets |
| `storage.read` | Read namespaced plugin storage |
| `storage.write` | Write or delete namespaced plugin storage |
| `slots.register` | Register UI slots |
| `admin.pages` | Register admin plugin pages |

