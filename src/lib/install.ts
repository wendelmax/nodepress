import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"

export async function checkInstallation(isInstallPage = false) {
  // If no DATABASE_URL is found, redirect to the setup-config wizard
  if (!process.env.DATABASE_URL) {
    if (!isInstallPage) {
      redirect("/setup-config")
    }
    return false
  }

  let userCount = 0;
  let dbError = false;

  try {
    userCount = await prisma.user.count()
  } catch (error: any) {
    // P2021 means the table does not exist, but connection was successful!
    if (error.code === 'P2021') {
      // Database is connected but tables aren't created yet — redirect to finish setup.
      if (!isInstallPage) {
        redirect("/admin/install")
      }
      return false
    }

    // Other errors (like P1001) mean connection failed.
    console.error("Database connection failed:", error.message)
    dbError = true;
  }

  if (dbError) {
    if (!isInstallPage) {
      redirect("/setup-config?db_error=true")
    }
    return false
  }

  // If no users, system is not installed
  if (userCount === 0 && !isInstallPage) {
    redirect("/admin/install")
  }
  
  // If users exist, system is already installed
  if (userCount > 0 && isInstallPage) {
    redirect("/login")
  }

  return true
}

