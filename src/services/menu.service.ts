import prisma from "@/lib/prisma"
import type { PluginMenuItem, PluginSurface } from '@/plugins/types'
import { validateMenuInput } from '@/plugins/validation'
import type { MenuNode } from './menu.types'

export class MenuService {
  private static pluginMenus = new Map<string, PluginMenuItem[]>()

  static registerPluginMenu(pluginId: string, item: PluginMenuItem): () => void {
    validateMenuInput(item)
    if (!pluginId || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pluginId)) {
      throw new Error(`Invalid plugin id for menu: ${pluginId}`)
    }

    const contribution: PluginMenuItem = {
      ...item,
      pluginId,
      position: item.position ?? 100,
    }
    const contributions = this.pluginMenus.get(pluginId) ?? []
    contributions.push(contribution)
    this.pluginMenus.set(pluginId, contributions)

    let removed = false
    return () => {
      if (removed) return
      removed = true
      const current = this.pluginMenus.get(pluginId) ?? []
      const remaining = current.filter((candidate) => candidate !== contribution)
      if (remaining.length === 0) this.pluginMenus.delete(pluginId)
      else this.pluginMenus.set(pluginId, remaining)
    }
  }

  static clearPluginMenus(pluginId?: string): void {
    if (pluginId) this.pluginMenus.delete(pluginId)
    else this.pluginMenus.clear()
  }

  static getPluginMenuTree(
    surface: PluginSurface,
    capabilityChecker: (capability?: string) => boolean,
  ): MenuNode[] {
    const allForSurface = [...this.pluginMenus.values()]
      .flat()
      .filter((item) => item.surface === surface)
    const allIds = new Set(allForSurface.map((item) => item.id))
    const visible = allForSurface
      .flat()
      .filter((item) => capabilityChecker(item.capability))
    const byId = new Map<string, PluginMenuItem>()
    for (const item of visible) {
      if (!byId.has(item.id)) byId.set(item.id, item)
    }

    let changed = true
    while (changed) {
      changed = false
      for (const item of [...byId.values()]) {
        if (!item.parentId || byId.has(item.parentId)) continue
        if (!allIds.has(item.parentId)) {
          throw new Error(`Menu parent not found: ${item.parentId}`)
        }
        byId.delete(item.id)
        changed = true
      }
    }

    const visiting = new Set<string>()
    const visited = new Set<string>()
    const visit = (id: string) => {
      if (visiting.has(id)) throw new Error(`Menu cycle detected at: ${id}`)
      if (visited.has(id)) return
      visiting.add(id)
      const item = byId.get(id)
      if (item?.parentId) visit(item.parentId)
      visiting.delete(id)
      visited.add(id)
    }
    for (const item of byId.values()) visit(item.id)

    const nodes = new Map<string, MenuNode>()
    for (const item of byId.values()) {
      nodes.set(item.id, Object.freeze({
        id: item.id,
        label: item.label,
        surface: item.surface,
        href: item.href,
        parentId: item.parentId,
        position: item.position ?? 100,
        capability: item.capability,
        icon: item.icon,
        pluginId: item.pluginId ?? '',
        children: [] as MenuNode[],
      }) as unknown as MenuNode)
    }

    const roots: MenuNode[] = []
    for (const node of nodes.values()) {
      if (node.parentId) nodes.get(node.parentId)?.children.push(node)
      else roots.push(node)
    }
    const sort = (items: MenuNode[]) => {
      items.sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
      for (const item of items) sort(item.children)
    }
    sort(roots)
    const freeze = (node: MenuNode): MenuNode => Object.freeze({
      ...node,
      children: Object.freeze(node.children.map(freeze)),
    }) as MenuNode
    return Object.freeze(roots.map(freeze)) as unknown as MenuNode[]
  }

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
