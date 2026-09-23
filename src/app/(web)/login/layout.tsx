import { checkInstallation } from "@/lib/install"

export const dynamic = "force-dynamic"

export default async function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await checkInstallation()

  return (
    <>{children}</>
  )
}
