import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const googleConfigured = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  providers: [
    ...(googleConfigured
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
          }),
        ]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Parolă", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
    Credentials({
      id: "otp",
      name: "cod-email",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Cod", type: "text" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase();
        const code = String(credentials?.code ?? "").trim();
        if (!email || !/^\d{6}$/.test(code)) return null;

        const token = await prisma.verificationToken.findFirst({
          where: { email, token: code },
          orderBy: { createdAt: "desc" },
        });
        if (!token || token.expires < new Date()) return null;

        await prisma.verificationToken.delete({ where: { id: token.id } });

        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              name:
                email.split("@")[0].replace(/[._\-+]+/g, " ").trim() ||
                "Elev",
              passwordHash: crypto.randomUUID(),
              emailVerified: new Date(),
            },
          });
        } else if (!user.emailVerified) {
          await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: new Date() },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const existing = await prisma.user.findUnique({
          where: { email: user.email },
        });
        if (existing) {
          if (!existing.image && user.image) {
            await prisma.user.update({
              where: { id: existing.id },
              data: { image: user.image },
            });
          }
        } else {
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name ?? user.email.split("@")[0],
              image: user.image ?? null,
              passwordHash: crypto.randomUUID(),
              emailVerified: new Date(),
            },
          });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, role: true, name: true, image: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.name = dbUser.name;
          // Doar URL-urile mici (ex. avatare Google) se păstrează în JWT.
          // Pozele încărcate local (data URL, mari) rămân în DB; JWT-ul stă mic
          // ca să nu depășească limita de header (HTTP 431).
          token.picture =
            dbUser.image && !dbUser.image.startsWith("data:image")
              ? dbUser.image
              : null;
          return token;
        }
      }
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.name = token.name;
        session.user.image = (token.picture as string) ?? null;
      }
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isAdmin = auth?.user?.role === "ADMIN";
      const { pathname } = request.nextUrl;

      if (pathname.startsWith("/admin")) {
        return isLoggedIn && isAdmin;
      }
      if (
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/progres") ||
        pathname.startsWith("/subiecte-bac") ||
        pathname.startsWith("/cont")
      ) {
        return isLoggedIn;
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
