/**
 * Utilitário para gerar URLs de posts baseadas na estrutura de Permalink.
 */

export function generatePermalink(post: { postName: string; postDate: Date }, structure: string = '/%postname%/'): string {
  if (!structure) {
    structure = '/%postname%/'
  }

  const date = new Date(post.postDate)
  
  // Extração de dados da data
  const year = date.getFullYear().toString()
  const monthnum = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')

  // Substituição das tags
  let permalink = structure
    .replace('%year%', year)
    .replace('%monthnum%', monthnum)
    .replace('%day%', day)
    .replace('%postname%', post.postName)

  // Limpar barras duplas ou finais caso hajam
  permalink = permalink.replace(/\/+/g, '/')
  if (permalink.endsWith('/')) {
    permalink = permalink.slice(0, -1)
  }

  // Garantir que comece com /
  if (!permalink.startsWith('/')) {
    permalink = '/' + permalink
  }

  return permalink
}
