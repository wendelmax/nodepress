import { HookService, type HookRegistry } from './hook.service'

export interface FormSubmittedEvent {
  formId: string
  formSlug?: string
  submissionId: number
  data: Record<string, unknown>
}

type HookDispatcher = Pick<HookRegistry, 'doAction'>

export async function dispatchFormSubmissionHooks(
  event: FormSubmittedEvent,
  dispatcher: HookDispatcher = HookService,
): Promise<void> {
  const specificKey = event.formSlug || event.formId
  const tags = [...new Set(['on_form_submitted', `on_form_submitted_${specificKey}`])]

  for (const tag of tags) {
    try {
      await dispatcher.doAction(tag, event)
    } catch (error) {
      console.error(`Form submission hook failed: ${tag}`, error)
    }
  }
}
