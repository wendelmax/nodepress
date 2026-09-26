import { checkInstallation } from '@/lib/install'

export const dynamic = 'force-dynamic'

export default async function SetupConfigLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Keep the wizard available before configuration or the first account
  // exists, but do not expose it after the site has been installed.
  await checkInstallation(true)

  return children
}
