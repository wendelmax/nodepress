import { redirect } from 'next/navigation'

export default async function PostsRedirect({ searchParams }: { searchParams: { type?: string } }) {
  const params = await searchParams
  const type = params?.type || 'post'
  redirect(`/admin/edit?post_type=${type}`)
}
