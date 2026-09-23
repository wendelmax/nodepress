import { NextResponse } from "next/server"
import { getAuthProviderAvailability } from "@/lib/auth-config.mjs"

export async function GET() {
  const availability = getAuthProviderAvailability(process.env)
  return NextResponse.json(availability)
}
