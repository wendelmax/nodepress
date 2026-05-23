import { redirect } from 'next/navigation'

export default function TagsRedirect() {
  redirect('/admin/edit-tags?taxonomy=post_tag')
}
