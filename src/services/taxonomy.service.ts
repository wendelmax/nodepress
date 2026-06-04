import prisma from "@/lib/prisma"

export class TaxonomyService {
  /**
   * Retrieves all terms for a specific taxonomy.
   * @param taxonomy The taxonomy name (e.g., 'category', 'post_tag')
   */
  static async getTermsByTaxonomy(taxonomy: string) {
    const taxonomies = await prisma.termTaxonomy.findMany({
      where: { taxonomy },
      include: {
        term: true
      }
    })

    return taxonomies.map(tax => ({
      id: tax.termId,
      name: tax.term.name,
      slug: tax.term.slug,
      description: tax.description,
      count: tax.count
    }))
  }

  /**
   * Retrieves a single term by its slug and taxonomy.
   */
  static async getTermBySlug(slug: string, taxonomy: string) {
    const termTaxonomy = await prisma.termTaxonomy.findFirst({
      where: {
        taxonomy,
        term: { slug }
      },
      include: {
        term: true
      }
    })

    if (!termTaxonomy) return null

    return {
      id: termTaxonomy.termId,
      name: termTaxonomy.term.name,
      slug: termTaxonomy.term.slug,
      description: termTaxonomy.description,
      count: termTaxonomy.count
    }
  }

  /**
   * Retrieves all post IDs associated with a specific term slug.
   */
  static async getPostIdsByTermSlug(slug: string, taxonomy: string): Promise<number[]> {
    const termTaxonomy = await prisma.termTaxonomy.findFirst({
      where: {
        taxonomy,
        term: { slug }
      },
      include: {
        relationships: {
          select: { objectId: true }
        }
      },
    })

    if (!termTaxonomy) return []
    return termTaxonomy.relationships.map(r => r.objectId)
  }

  /**
   * Creates a new term and assigns it to a taxonomy.
   */
  static async createTerm(name: string, slug: string, description: string, taxonomy: string) {
    // Basic slug generation if not provided
    if (!slug) {
      slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
    }

    // Check if term already exists
    let term = await prisma.term.findFirst({ where: { slug } })

    if (!term) {
      term = await prisma.term.create({
        data: { name, slug, termGroup: 0 }
      })
    }

    // Check if it's already in this taxonomy
    let termTaxonomy = await prisma.termTaxonomy.findFirst({
      where: { termId: term.termId, taxonomy }
    })

    if (!termTaxonomy) {
      termTaxonomy = await prisma.termTaxonomy.create({
        data: {
          termId: term.termId,
          taxonomy,
          description: description || '',
          parent: 0,
          count: 0
        }
      })
    }

    return {
      id: term.termId,
      name: term.name,
      slug: term.slug,
      description: termTaxonomy.description,
      count: termTaxonomy.count
    }
  }

  /**
   * Links a post (objectId) to multiple term IDs.
   * Clears existing relationships first.
   */
  static async syncPostTerms(postId: number, termIds: number[]) {
    // Start fresh by deleting current relationships
    await prisma.termRelationship.deleteMany({
      where: { objectId: postId }
    })

    if (termIds.length === 0) return;

    const taxonomies = await prisma.termTaxonomy.findMany({
      where: { termId: { in: termIds } }
    })

    if (taxonomies.length > 0) {
      await prisma.termRelationship.createMany({
        data: taxonomies.map(tax => ({
          objectId: postId,
          termTaxonomyId: tax.termTaxonomyId,
          termOrder: 0
        }))
      })
    }
  }

  /**
   * Gets the IDs of terms associated with a specific post.
   */
  static async getPostTermIds(postId: number, taxonomy: string): Promise<number[]> {
    const relationships = await prisma.termRelationship.findMany({
      where: {
        objectId: postId,
        termTaxonomy: {
          taxonomy
        }
      },
      select: {
        termTaxonomy: {
          select: {
            termId: true
          }
        }
      }
    })

    return relationships.map(r => r.termTaxonomy.termId)
  }

  /**
   * Gets fully populated terms associated with a specific post.
   */
  static async getPostTerms(postId: number, taxonomy: string) {
    const relationships = await prisma.termRelationship.findMany({
      where: {
        objectId: postId,
        termTaxonomy: {
          taxonomy
        }
      },
      include: {
        termTaxonomy: {
          include: {
            term: true
          }
        }
      }
    })

    return relationships.map(r => ({
      id: r.termTaxonomy.termId,
      name: r.termTaxonomy.term.name,
      slug: r.termTaxonomy.term.slug
    }))
  }
}
