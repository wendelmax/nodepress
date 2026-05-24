import { redirect } from 'next/navigation'

export default function PagesRedirect() {
  redirect('/admin/posts?post_type=page')
}
