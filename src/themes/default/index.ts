import { NodePressTheme } from '../types'
import SinglePost from './templates/SinglePost'
import SinglePage from './templates/SinglePage'
import Archive from './templates/Archive'

const DefaultTheme: NodePressTheme = {
  meta: {
    name: "NodePress Default",
    description: "The official minimalist theme for NodePress. Fast, clean, and accessible.",
    author: "NodePress Team",
    version: "1.0.0",
    slug: "default"
  },
  SinglePost,
  SinglePage,
  Archive
}

export default DefaultTheme
