import { redirect } from 'next/navigation'

export default function PagesRedirect() {
  redirect('/admin/edit?post_type=page')
}
