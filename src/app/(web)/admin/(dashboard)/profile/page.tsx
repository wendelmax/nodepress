import { auth } from "@/auth"
import { UserService } from "@/services/user.service"
import { notFound } from "next/navigation"
import ProfileForm from "@/components/admin/ProfileForm"

export default async function MyProfilePage() {
  const session = await auth()
  
  if (!session || !session.user || !(session.user as any).id) {
    return notFound()
  }

  const userId = parseInt((session.user as any).id)
  const user = await UserService.getById(userId)

  if (!user) {
    return notFound()
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="border-b border-border/40 pb-4">
        <h1 className="text-2xl font-bold text-text leading-none">Meu Perfil</h1>
        <p className="text-xs text-text-secondary mt-1.5">
          Gerencie suas informações pessoais e opções de acesso.
        </p>
      </div>

      <ProfileForm user={user} />
    </div>
  )
}
