import prisma from "@/lib/prisma"

export class MenuService {
  /**
   * Retorna todos os menus disponíveis (taxonomia 'nav_menu')
   */
  static async getMenus() {
    const taxonomies = await prisma.termTaxonomy.findMany({
      where: { taxonomy: 'nav_menu' },
      include: { term: true }
    })

    return taxonomies.map(tax => ({
      id: tax.termId,
      name: tax.term.name,
      slug: tax.term.slug,
    }))
  }

  /**
   * Cria um novo menu
   */
  static async createMenu(name: string) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')

    let term = await prisma.term.findFirst({ where: { slug } })
    if (!term) {
      term = await prisma.term.create({ data: { name, slug, termGroup: 0 } })
    }

    let termTaxonomy = await prisma.termTaxonomy.findFirst({
      where: { termId: term.termId, taxonomy: 'nav_menu' }
    })

    if (!termTaxonomy) {
      termTaxonomy = await prisma.termTaxonomy.create({
        data: {
          termId: term.termId,
          taxonomy: 'nav_menu',
          description: '',
          parent: 0,
          count: 0
        }
      })
    }

    return { id: term.termId, name: term.name, slug: term.slug }
  }

  /**
   * Busca um menu pelo slug e retorna seus itens ordenados
   */
  static async getMenuItemsBySlug(slug: string) {
    const termTaxonomy = await prisma.termTaxonomy.findFirst({
      where: { taxonomy: 'nav_menu', term: { slug } }
    })

    if (!termTaxonomy) return []

    // Busca os posts associados ao menu através de term_relationships
    const relationships = await prisma.termRelationship.findMany({
      where: { termTaxonomyId: termTaxonomy.termTaxonomyId }
    })

    const postIds = relationships.map(r => r.objectId)
    if (postIds.length === 0) return []

    const items = await prisma.post.findMany({
      where: { id: { in: postIds }, postType: 'nav_menu_item', postStatus: 'publish' },
      orderBy: { menuOrder: 'asc' },
      include: {
        meta: {
          where: { metaKey: '_menu_item_url' }
        }
      }
    })

    return items.map(item => {
      const urlMeta = item.meta.find(m => m.metaKey === '_menu_item_url')
      return {
        id: item.id,
        title: item.postTitle,
        url: urlMeta?.metaValue || '#',
        order: item.menuOrder
      }
    })
  }

  /**
   * Adiciona um item (custom link) ao menu
   */
  static async addMenuItem(menuId: number, title: string, url: string, order: number = 0) {
    // Pegar o termTaxonomyId
    const termTaxonomy = await prisma.termTaxonomy.findFirst({
      where: { termId: menuId, taxonomy: 'nav_menu' }
    })

    if (!termTaxonomy) throw new Error("Menu not found")

    // 1. Criar o Post do item
    const post = await prisma.post.create({
      data: {
        postTitle: title,
        postContent: '',
        postExcerpt: '',
        postStatus: 'publish',
        postType: 'nav_menu_item',
        postName: `menu-item-${Date.now()}`,
        postAuthor: 1, // Assumindo admin
        menuOrder: order,
        postPassword: '',
        toPing: '',
        pinged: '',
        postContentFiltered: '',
        guid: '',
        postMimeType: '',
      }
    })

    // 2. Salvar a URL no postmeta
    await prisma.postMeta.create({
      data: {
        postId: post.id,
        metaKey: '_menu_item_url',
        metaValue: url
      }
    })

    // 3. Linkar ao Menu (term_relationships)
    await prisma.termRelationship.create({
      data: {
        objectId: post.id,
        termTaxonomyId: termTaxonomy.termTaxonomyId,
        termOrder: 0
      }
    })

    return { id: post.id, title, url, order }
  }

  /**
   * Exclui um item de menu
   */
  static async deleteMenuItem(itemId: number) {
    // Deletar o post deleta em cascade os relacionamentos e metadados graças à FK (se existir).
    // Mas no nosso schema, `TermRelationship` não tem FK para `Post`. O `Post` também não tem onDelete:Cascade.
    // Portanto, deletamos manualmente o relacionamento primeiro.
    await prisma.termRelationship.deleteMany({ where: { objectId: itemId } })
    await prisma.postMeta.deleteMany({ where: { postId: itemId } })
    return prisma.post.delete({ where: { id: itemId } })
  }

  /**
   * Atualiza a ordem dos itens (recebe um array de IDs na nova ordem)
   */
  static async updateItemsOrder(orderedIds: number[]) {
    // Executa updates em paralelo
    const updates = orderedIds.map((id, index) => {
      return prisma.post.update({
        where: { id },
        data: { menuOrder: index }
      })
    })

    await Promise.all(updates)
    return true
  }
}
