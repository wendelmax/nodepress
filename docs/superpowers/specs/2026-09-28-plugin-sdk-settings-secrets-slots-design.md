# Plugin SDK: settings, secrets, storage and slots

## Context

Issue #70 extends the existing plugin lifecycle, capability and namespaced-storage foundations. The goal is to make native plugins useful for real integrations without allowing them to reach into application internals or expose sensitive configuration.

## Decisions

- Plugin settings are declared in the plugin manifest and persisted through the existing namespaced storage service.
- Settings support text, number, boolean, select and JSON values. Definitions and values are validated at runtime.
- Settings keys reserve a tenant segment (`global` by default), so the public API can become tenant-aware without changing plugin code.
- Secrets use a separate API and are encrypted with AES-256-GCM before being persisted. Secret values are never returned by settings snapshots and are not part of UI/status payloads.
- Settings, secrets, storage and UI registration are capabilities. A plugin must declare the relevant permission before using them.
- UI slots are typed registration points backed by the existing reversible hook infrastructure. Registration returns cleanup and is removed on deactivation.
- Admin settings pages are registered through the same reversible mechanism and render through the existing dynamic admin plugin-page route.
- Plugin health is an explicit optional callback. Failures are converted into a safe `unhealthy` result without returning the original error text.
- Existing lifecycle and dependency/engine checks remain the source of truth for activation order and compatibility.

## Public contract

```ts
interface PluginContext {
  settings: PluginSettings
  secrets: PluginSecrets
  slots: PluginSlotRegistrar
  adminPages: PluginAdminPageRegistrar
}

interface NodePressPlugin {
  settings?: readonly PluginSettingDefinition[]
  secrets?: readonly PluginSecretDefinition[]
  health?: () => PluginHealth | Promise<PluginHealth>
}
```

Fixed capabilities are `settings.read`, `settings.write`, `secrets.read`, `secrets.write`, `storage.read`, `storage.write`, `slots.register` and `admin.pages`. Plugins can still declare additional domain-specific capabilities for their own APIs.

## Compatibility and safety

- Existing plugins that do not use these new APIs remain valid.
- Secret storage fails clearly when no encryption key is configured; no plaintext fallback is allowed.
- Unknown setting or secret identifiers are rejected.
- Slot and admin-page registrations are cleaned up with the plugin runtime.
- Public documentation includes an example plugin using settings, a secret and an admin slot.

