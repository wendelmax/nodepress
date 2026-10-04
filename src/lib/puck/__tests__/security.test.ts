import { describe, expect, it } from 'vitest'
import {
  BUILDER_SCRIPTS_CAPABILITY,
  createBuilderSecurityPolicy,
  sanitizeHtml,
  sanitizeUrl,
} from '../security'
import { puckConfig } from '../config'

describe('builder security contract', () => {
  it('sanitizes executable HTML while preserving accessible content', () => {
    const sanitized = sanitizeHtml(
      '<p onclick="alert(1)">Olá<script>alert(1)</script></p>'
        + '<a href="javascript:alert(1)">link</a>'
        + '<img src="https://cdn.example.test/photo.jpg" alt="Foto">',
    )

    expect(sanitized).toContain('<p>Olá</p>')
    expect(sanitized).toContain('<a>link</a>')
    expect(sanitized).toContain('src="https://cdn.example.test/photo.jpg"')
    expect(sanitized).toContain('alt="Foto"')
    expect(sanitized).toContain('loading="lazy"')
    expect(sanitized).toContain('decoding="async"')
    expect(sanitized).not.toMatch(/script|onclick|javascript:/i)
  })

  it('allows only safe URL protocols and local paths', () => {
    expect(sanitizeUrl('/posts/hello')).toBe('/posts/hello')
    expect(sanitizeUrl('https://example.test/page')).toBe('https://example.test/page')
    expect(sanitizeUrl('mailto:hello@example.test')).toBe('mailto:hello@example.test')
    expect(sanitizeUrl('javascript:alert(1)')).toBeUndefined()
    expect(sanitizeUrl('java\nscript:alert(1)')).toBeUndefined()
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBeUndefined()
  })

  it('blocks scripts by default and requires an explicit capability', () => {
    expect(createBuilderSecurityPolicy().allowScripts).toBe(false)
    expect(createBuilderSecurityPolicy(['posts.read']).allowScripts).toBe(false)
    expect(createBuilderSecurityPolicy([BUILDER_SCRIPTS_CAPABILITY]).allowScripts).toBe(true)
  })

  it('does not pass unsafe Builder URLs to anchor or image props', () => {
    const button = puckConfig.components.Button as { render: (props: any) => any }
    const image = puckConfig.components.Image as { render: (props: any) => any }

    const buttonElement = button.render({
      label: 'Open',
      href: 'javascript:alert(1)',
      variant: 'primary',
      align: 'left',
    })
    const imageElement = image.render({
      url: 'data:text/html,<script>alert(1)</script>',
      alt: 'Unsafe',
      objectFit: 'cover',
    })

    expect(buttonElement.props.children.props.href).toBe('#')
    expect(imageElement.props.children).toBeUndefined()
  })
})
