import prisma from "@/lib/prisma"
import { PostService } from "@/services/post.service"
import { notFound } from "next/navigation"
import FormEditor from "@/components/admin/FormEditor"

export default async function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const form = await PostService.getById(parseInt(id, 10))

  if (!form || form.postType !== 'form') {
    return notFound()
  }

  // Real submissions live in FormSubmission (keyed by formId), never as
  // Post rows -- this used to query Post.getChildren(form.id,
  // 'form_submission'), which nothing ever wrote to, so it always
  // returned an empty array.
  const submissions = await prisma.formSubmission.findMany({
    where: { formId: String(form.id) },
    orderBy: { createdAt: 'desc' }
  })

  return <FormEditor form={form} submissions={submissions} />
}
