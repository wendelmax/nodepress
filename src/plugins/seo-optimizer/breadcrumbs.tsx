import Link from 'next/link'

export function SeoBreadcrumbs({
  postTitle,
  isPage,
  categories,
}: {
  postTitle: string
  isPage: boolean
  categories: Array<{ slug: string; name: string }>
}) {
  return (
    <nav className="mb-8 flex items-center gap-2 text-sm text-text-muted" aria-label="Breadcrumb">
      <Link href="/" className="hover:text-primary transition-colors">Home</Link>
      {!isPage && categories.length > 0 && (
        <>
          <span>/</span>
          <Link href={`/category/${categories[0].slug}`} className="hover:text-primary transition-colors">
            {categories[0].name}
          </Link>
        </>
      )}
      <span>/</span>
      <span className="text-text-secondary truncate">{postTitle}</span>
    </nav>
  )
}
