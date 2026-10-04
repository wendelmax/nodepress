import { PostService } from "@/services/post.service"
import { notFound } from "next/navigation"
import FormEditor from "@/components/admin/FormEditor"
import { PrismaLeadRepository } from "@/modules/leads"

export default async function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const form = await PostService.getById(parseInt(id, 10))

  if (!form || form.postType !== 'form') {
    return notFound()
  }

  const leads = await new PrismaLeadRepository().list()
  const submissions = leads
    .filter(lead => lead.sourceFormId === `legacy-${form.id}` || lead.sourceFormId === String(form.id))
    .map(lead => ({
      id: lead.id,
      payload: JSON.stringify(lead.data),
      createdAt: lead.createdAt,
      status: lead.status === 'new' ? 'unread' : 'read',
    }))

  return <FormEditor form={form} submissions={submissions} />
}
