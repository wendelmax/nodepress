import { createBuilderDocument } from './document'
import type { PatternPackage } from './patterns'

const section = (content: unknown[]) => ({
  type: 'Section',
  props: {
    content,
    as: 'section',
    padding: { desktop: 64, tablet: 48, mobile: 32 },
    background: 'surface',
    overlay: 'transparent',
    border: 'none',
    radius: { desktop: 24, tablet: 20, mobile: 16 },
    visibility: true,
  },
})

const heading = (title: string, level: 'h1' | 'h2' = 'h2') => ({
  type: 'Heading',
  props: { title, level, align: 'center' },
})

const text = (value: string) => ({
  type: 'Text',
  props: { text: value, align: 'center' },
})

export const defaultPatterns: PatternPackage[] = [
  {
    manifest: {
      format: 'nodepress-pattern', formatVersion: 1, id: 'blog-hero', name: 'Blog Hero',
      description: 'Hero responsivo para a página inicial de um blog.', kind: 'section',
      category: 'Blog', tags: ['blog', 'hero'], engine: '>=1.0.0', schemaVersion: 1, version: 1,
    },
    document: createBuilderDocument({ root: {}, content: [section([heading('Conteúdo que merece ser lido', 'h1'), text('Apresente seus artigos mais importantes com clareza.')])] }),
  },
  {
    manifest: {
      format: 'nodepress-pattern', formatVersion: 1, id: 'institutional-intro', name: 'Institucional Intro',
      description: 'Introdução para sites institucionais e organizações.', kind: 'section',
      category: 'Institucional', tags: ['institucional', 'intro'], engine: '>=1.0.0', schemaVersion: 1, version: 1,
    },
    document: createBuilderDocument({ root: {}, content: [section([heading('Nossa missão'), text('Conte a história, os valores e o impacto da sua organização.')])] }),
  },
  {
    manifest: {
      format: 'nodepress-pattern', formatVersion: 1, id: 'ong-impact', name: 'ONG Impact',
      description: 'Bloco de impacto para organizações sociais e projetos comunitários.', kind: 'section',
      category: 'ONG', tags: ['ong', 'impacto'], engine: '>=1.0.0', schemaVersion: 1, version: 1,
    },
    document: createBuilderDocument({ root: {}, content: [section([heading('Juntos transformamos realidades'), text('Mostre resultados, histórias e formas de participar.')])] }),
  },
  {
    manifest: {
      format: 'nodepress-pattern', formatVersion: 1, id: 'landing-conversion', name: 'Landing Conversion',
      description: 'Seção inicial para landing pages orientadas à conversão.', kind: 'page',
      category: 'Landing pages', tags: ['landing', 'conversão'], engine: '>=1.0.0', schemaVersion: 1, version: 1,
    },
    document: createBuilderDocument({ root: {}, content: [section([heading('Uma proposta clara para o seu público', 'h1'), text('Explique o próximo passo e conduza visitantes à ação.')])] }),
  },
]
