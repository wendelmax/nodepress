import type { ContentService, ContentRepository, CreateContentInput } from '@/modules/content/content.service'
import type { ContentRecord } from '@/modules/content/content.service'
import type { PayloadContentWriter } from './contracts'

export class ContentServicePayloadWriter implements PayloadContentWriter {
  constructor(private readonly service: ContentService) {}

  async validate(input: CreateContentInput): Promise<void> {
    await this.service.validate(input)
  }

  create(input: CreateContentInput): Promise<ContentRecord> {
    return this.service.create(input)
  }

  update(id: string, data: Record<string, unknown>): Promise<ContentRecord> {
    return this.service.update(id, { data })
  }
}

export type { ContentRepository }
