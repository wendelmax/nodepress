import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "admin" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { userLogin: credentials.username },
              { userEmail: credentials.username }
            ]
          },
          include: { meta: true }
        })

        if (!user) {
          return null
        }

        const isValid = await bcrypt.compare(credentials.password, user.userPass)

        if (!isValid) {
          return null
        }

        const roleMeta = user.meta.find(m => m.metaKey === '_np_role')
        const role = roleMeta ? roleMeta.metaValue : (user.userStatus === 0 ? 'admin' : 'author')

        return {
          id: user.id.toString(),
          name: user.displayName || user.userLogin,
          email: user.userEmail,
          role: role
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session
    }
  }
}

