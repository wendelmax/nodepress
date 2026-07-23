import NextAuth from "next-auth"
import Keycloak from "next-auth/providers/keycloak"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"

type AppRole = "admin" | "author" | "subscriber"

function mapRealmRolesToAppRole(roles: string[] | undefined): AppRole {
  if (roles?.includes("nodepress-admin")) return "admin"
  if (roles?.includes("nodepress-author")) return "author"
  return "subscriber"
}

const keycloakBase = process.env.NEXT_PUBLIC_KEYCLOAK_URL || "http://localhost:8180"
const realm = process.env.AUTH_KEYCLOAK_REALM || "master"
const issuer = `${keycloakBase}/realms/${realm}`

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Keycloak({
      name: "Navant ID",
      clientId: process.env.AUTH_KEYCLOAK_ID!,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET!,
      issuer,
      wellKnown: `${issuer}/.well-known/openid-configuration`,
      // `idToken: true` is the library default already — kept explicit
      // because realm_access.roles below depends on it staying true
      // (false would switch to the /userinfo response, which Keycloak
      // does not populate with realm_access by default).
      idToken: true,
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        const keycloakSub = account.providerAccountId
        const email = profile?.email as string | undefined
        const name = (profile?.name as string | undefined) ?? email

        let dbUser = await prisma.user.findUnique({ where: { keycloakSub } })

        if (!dbUser && email) {
          const byEmail = await prisma.user.findUnique({ where: { userEmail: email } })
          if (byEmail) {
            dbUser = await prisma.user.update({
              where: { id: byEmail.id },
              data: { keycloakSub },
            })
          }
        }

        if (!dbUser) {
          const unusableHash = await bcrypt.hash(crypto.randomUUID(), 10)
          const loginBase = email ?? keycloakSub
          dbUser = await prisma.user.create({
            data: {
              keycloakSub,
              userLogin: loginBase,
              userEmail: email ?? `${keycloakSub}@keycloak.local`,
              userNicename: loginBase.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
              userPass: unusableHash,
              userUrl: "",
              userActivationKey: "",
              displayName: name ?? loginBase,
            },
          })
        }

        token.id = dbUser.id.toString()
        const realmRoles = (profile as unknown as { realm_access?: { roles?: string[] } } | undefined)
          ?.realm_access?.roles
        token.role = mapRealmRolesToAppRole(realmRoles)
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.id
        ;(session.user as any).role = token.role
      }
      return session
    },
  },
})
