import PostEditor from "@/components/admin/PostEditor"
import { OptionService } from "@/services/option.service"

export default async function PostNewPage({ searchParams }: { searchParams: Promise<{ post_type?: string }> }) {
  const params = await searchParams
  const postType = params.post_type || 'post'
  
  const options = await OptionService.getOptions(['acf_field_groups'])
  const fieldGroups = options.acf_field_groups ? JSON.parse(options.acf_field_groups) : []

  return <PostEditor postType={postType} fieldGroups={fieldGroups} />
}
