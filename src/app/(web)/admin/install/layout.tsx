import { checkInstallation } from "@/lib/install"

export default async function InstallLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await checkInstallation(true)

  return (
    <>{children}</>
  )
}
