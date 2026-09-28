import React from 'react'
import type { NodePressPlugin } from '../types'

/** Reference implementation for marketplace authors; it is not auto-installed. */
const settingsSlotPlugin: NodePressPlugin = {
  id: 'settings-slot-example',
  name: 'Settings and Slot Example',
  version: '1.0.0',
  permissions: [
    'settings.read', 'settings.write', 'secrets.read', 'secrets.write',
    'slots.register', 'admin.pages',
  ],
  settings: [
    { id: 'enabled', label: 'Enabled', type: 'boolean', defaultValue: true },
    { id: 'label', label: 'Label', type: 'text', defaultValue: 'Example' },
  ],
  secrets: [{ id: 'providerToken', label: 'Provider token' }],
  async register({ settings, secrets, slots, adminPages }) {
    await settings.get<boolean>('enabled')
    await secrets.has('providerToken')
    slots.register({
      id: 'settings-slot-example',
      surface: 'admin',
      render: () => React.createElement('span', null, 'Example plugin slot'),
    })
    adminPages.register({
      slug: 'settings-slot-example',
      label: 'Example settings',
      render: () => React.createElement('p', null, 'Configure the example plugin.'),
    })
  },
}

export default settingsSlotPlugin
