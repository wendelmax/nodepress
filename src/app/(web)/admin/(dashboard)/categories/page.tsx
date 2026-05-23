import { redirect } from 'next/navigation'

export default function CategoriesRedirect() {
  redirect('/admin/edit-tags?taxonomy=category')
}
