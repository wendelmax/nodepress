import type { Config } from '@measured/puck'
import { getClientEditableFields } from '@/modules/builder-collaboration/policy'

type PuckComponent = {
  fields?: Record<string, unknown>
  [key: string]: unknown
}

/**
 * Creates the presentation-time Puck config for client editing.
 *
 * This is intentionally only a UI allowlist. The Builder API repeats the
 * policy checks so a crafted request cannot use this helper to bypass auth.
 */
export function createClientPuckConfig(config: Config<any>): Config<any> {
  const components: Record<string, PuckComponent> = {}

  for (const [componentType, rawComponent] of Object.entries(config.components)) {
    const editableFields = getClientEditableFields(componentType)
    if (!editableFields.length && componentType !== 'Spacer') continue

    const component = rawComponent as PuckComponent
    const fields = component.fields ?? {}
    const filteredFields = Object.fromEntries(
      editableFields
        .filter((fieldName) => Object.prototype.hasOwnProperty.call(fields, fieldName))
        .map((fieldName) => [fieldName, fields[fieldName]]),
    )

    components[componentType] = {
      ...component,
      fields: filteredFields,
    }
  }

  return {
    ...config,
    components: components as Config<any>['components'],
  }
}
