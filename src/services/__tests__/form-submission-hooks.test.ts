import { describe, expect, it, vi } from 'vitest'
import { HookRegistry } from '../hook.service'
import { dispatchFormSubmissionHooks, type FormSubmittedEvent } from '../form-submission-hooks'

const event: FormSubmittedEvent = {
  formId: '42',
  formSlug: 'admissions',
  submissionId: 7,
  data: { name: 'Ada Lovelace' },
}

describe('form submission hooks', () => {
  it('awaits the general and form-specific actions with the same event', async () => {
    const registry = new HookRegistry()
    const received: string[] = []

    registry.addAction('on_form_submitted', async (receivedEvent: FormSubmittedEvent) => {
      await Promise.resolve()
      received.push(`general:${receivedEvent.submissionId}`)
    })
    registry.addAction('on_form_submitted_admissions', (receivedEvent: FormSubmittedEvent) => {
      received.push(`specific:${receivedEvent.formSlug}:${receivedEvent.formId}`)
    })

    await dispatchFormSubmissionHooks(event, registry)

    expect(received).toEqual(['general:7', 'specific:admissions:42'])
  })

  it('continues with the form-specific action when a general action fails', async () => {
    const registry = new HookRegistry()
    const specificAction = vi.fn()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    registry.addAction('on_form_submitted', () => {
      throw new Error('plugin failed')
    })
    registry.addAction('on_form_submitted_admissions', specificAction)

    await expect(dispatchFormSubmissionHooks(event, registry)).resolves.toBeUndefined()

    expect(specificAction).toHaveBeenCalledWith(event)
    expect(errorSpy).toHaveBeenCalledOnce()
    errorSpy.mockRestore()
  })

  it('uses the form id for the specific action when no slug is available', async () => {
    const registry = new HookRegistry()
    const specificAction = vi.fn()

    registry.addAction('on_form_submitted_42', specificAction)

    await dispatchFormSubmissionHooks({ ...event, formSlug: undefined }, registry)

    expect(specificAction).toHaveBeenCalledWith({ ...event, formSlug: undefined })
  })
})
