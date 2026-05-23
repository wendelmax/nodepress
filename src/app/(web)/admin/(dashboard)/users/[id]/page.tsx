import { UserService } from "@/services/user.service"
import { notFound } from "next/navigation"
import ProfileForm from "@/components/admin/ProfileForm"

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: paramId } = await params
  const id = parseInt(paramId)

  if (isNaN(id)) {
    return notFound()
  }

  const user = await UserService.getById(id)

  if (!user) {
    return notFound()
  }

  return (
    <div>
      <ProfileForm user={user} />
    </div>
  )
}
