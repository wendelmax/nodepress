import NextAuth from "next-auth"
import Keycloak from "next-auth/providers/keycloak"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"
import { getAuthProviderAvailability } from "@/lib/auth-config.mjs"
import { normalizeRole } from "@/lib/role-normalization.mjs"
import { verifyLocalCredentials } from "@/lib/local-auth.mjs"
import { linkKeycloakIdentity } from "@/lib/user-identity-linking.mjs"

type AppRole = "admin" | "editor" | "author" | "contributor" | "subscriber"

function mapRealmRolesToAppRole(roles: string[] | undefined): AppRole {
  if (roles?.includes("nodepress-admin")) return "admin"
  if (roles?.includes("nodepress-editor")) return "editor"
  if (roles?.includes("nodepress-author")) return "author"
  if (roles?.includes("nodepress-contributor")) return "contributor"
  return "subscriber"
}

const availability = getAuthProviderAvailability(process.env)
const keycloakBase = process.env.NEXT_PUBLIC_KEYCLOAK_URL || "http://localhost:8180"
const realm = process.env.AUTH_KEYCLOAK_REALM || "master"
const issuer = `${keycloakBase}/realms/${realm}`
const providers = [] as any[]

if (availability.local) {
  providers.push(
    Credentials({
      name: "Conta local",
      credentials: {
        identifier: { label: "Usuário ou e-mail", type: "text" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        return verifyLocalCredentials(credentials, async (identifier: string) => {
          return prisma.user.findFirst({
            where: {
              OR: [{ userLogin: identifier }, { userEmail: identifier }],
            },
            include: { meta: true },
          })
        })
      },
    }),
  )
}

if (availability.keycloak) {
  providers.push(
    Keycloak({
      name: "Navant ID",
      clientId: process.env.AUTH_KEYCLOAK_ID!,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET!,
      issuer,
      wellKnown: `${issuer}/.well-known/openid-configuration`,
      idToken: true,
    }),
  )
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, account, profile, user }) {
      if (account?.provider === "credentials" && user) {
        const localUser = user as { id: string; role?: string }
        token.id = localUser.id
        token.role = normalizeRole(localUser.role)
        token.authProvider = "local"
      }

      if (account?.provider === "keycloak") {
        const keycloakSub = account.providerAccountId
        const email = profile?.email as string | undefined
        const name = (profile?.name as string | undefined) ?? email

        const identity = await linkKeycloakIdentity(
          {
            keycloakSub,
            email,
            name,
            roles: ((profile as unknown as { realm_access?: { roles?: string[] } } | undefined)
              ?.realm_access?.roles) || [],
          },
          {
            findByKeycloakSub: (sub: string) => prisma.user.findUnique({ where: { keycloakSub: sub }, include: { meta: true } }),
            findByEmail: (userEmail: string) => prisma.user.findUnique({ where: { userEmail }, include: { meta: true } }),
            linkByEmail: (id: number, sub: string) => prisma.user.update({
              where: { id },
              data: { keycloakSub: sub },
              include: { meta: true },
            }),
            create: async (data: { keycloakSub: string; userLogin: string; userEmail: string; userNicename: string; displayName: string; role: string }) => {
              const unusableHash = await bcrypt.hash(crypto.randomUUID(), 10)
              const created = await prisma.user.create({
                data: {
                  keycloakSub: data.keycloakSub,
                  userLogin: data.userLogin,
                  userEmail: data.userEmail,
                  userNicename: data.userNicename,
                  userPass: unusableHash,
                  userUrl: "",
                  userActivationKey: "",
                  displayName: data.displayName,
                  meta: {
                    create: {
                      metaKey: "capabilities",
                      metaValue: JSON.stringify({ [data.role]: true }),
                    },
                  },
                },
                include: { meta: true },
              })
              return { ...created, role: data.role }
            },
          },
        )

        if (identity.conflict) throw new Error("The Keycloak identity is already linked to another account")
        const dbUser = identity.user

        token.id = dbUser.id.toString()
        const realmRoles = (profile as unknown as { realm_access?: { roles?: string[] } } | undefined)
          ?.realm_access?.roles
        const hasKnownRealmRole = realmRoles?.some((role) => role.startsWith("nodepress-"))
        const storedRole = dbUser.meta?.find((item: { metaKey: string | null }) => item.metaKey === "capabilities")?.metaValue
        token.role = hasKnownRealmRole ? mapRealmRolesToAppRole(realmRoles) : normalizeRole(storedRole)
        token.authProvider = "keycloak"
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.id
        ;(session.user as any).role = token.role
        ;(session.user as any).authProvider = token.authProvider
      }
      return session
    },
  },
})
