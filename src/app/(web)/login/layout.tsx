import { checkInstallation } from "@/lib/install"

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
