import defaultTheme from './default'

const MinimalTheme = {
  ...defaultTheme,
  meta: {
    name: "Minimal Clean",
    description: "Um tema focado 100% em texto, ideal para escritores e blogs rápidos.",
    author: "NodePress Team",
    version: "1.0.0",
    slug: "minimal"
  }
}

export const themes = {
  'default': defaultTheme,
  'minimal': MinimalTheme
}
