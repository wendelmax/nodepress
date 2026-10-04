import type { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import type { FormRepository } from './service'
import type { FormDefinition, FormField, FormSubmission } from './types'

export class PrismaFormRepository implements FormRepository {
  async createForm(input: Omit<FormDefinition, 'id' | 'createdAt' | 'updatedAt'>): Promise<FormDefinition> {
    const row = await prisma.formDefinition.create({
      data: {
        slug: input.slug,
        name: input.name,
        status: input.status,
        fields: input.fields as unknown as Prisma.InputJsonValue,
      },
    })
    return toFormDefinition(row)
  }

  async findFormById(id: string): Promise<FormDefinition | undefined> {
    const row = await prisma.formDefinition.findUnique({ where: { id } })
    return row ? toFormDefinition(row) : undefined
  }

  async findFormBySlug(slug: string): Promise<FormDefinition | undefined> {
    const row = await prisma.formDefinition.findUnique({ where: { slug } })
    return row ? toFormDefinition(row) : undefined
  }

  async createSubmission(input: Omit<FormSubmission, 'id' | 'createdAt'>): Promise<FormSubmission> {
    const row = await prisma.formEngineSubmission.create({
      data: {
        formId: input.formId,
        payload: input.payload as Prisma.InputJsonValue,
      },
    })
    return toFormSubmission(row)
  }

  async listSubmissions(formId: string): Promise<FormSubmission[]> {
    const rows = await prisma.formEngineSubmission.findMany({
      where: { formId },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map(toFormSubmission)
  }
}

function toFormDefinition(row: {
  id: string
  slug: string
  name: string
  status: string
  fields: Prisma.JsonValue
  createdAt: Date
  updatedAt: Date
}): FormDefinition {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status as FormDefinition['status'],
    fields: row.fields as unknown as FormField[],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toFormSubmission(row: {
  id: string
  formId: string
  payload: Prisma.JsonValue
  createdAt: Date
}): FormSubmission {
  return {
    id: row.id,
    formId: row.formId,
    payload: row.payload as Record<string, unknown>,
    createdAt: row.createdAt,
  }
}
