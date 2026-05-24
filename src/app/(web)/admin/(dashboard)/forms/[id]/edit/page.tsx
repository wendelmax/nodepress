import { PostService } from "@/services/post.service"
import { notFound } from "next/navigation"
import FormEditor from "@/components/admin/FormEditor"

export default async function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const form = await PostService.getById(parseInt(id, 10))

  if (!form || form.postType !== 'form') {
    return notFound()
  }

  // Fetch submissions
  const submissions = await PostService.getChildren(form.id, 'form_submission')

  return <FormEditor form={form} submissions={submissions} />
}
