import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  otpVerifyRateLimit,
  otpVerifyRateLimitSuccess,
} from "@/lib/otp-rate-limit";
import { buildUsername, uniqueUsername } from "@/lib/username";

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

        // Conturile neactivate (email neverificat) nu se pot autentica cu parolă.
        if (!user.emailVerified) return null;

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
      async authorize(credentials, request) {
        const email = String(credentials?.email ?? "").toLowerCase();
        const code = String(credentials?.code ?? "").trim();
        if (!email || !/^\d{6}$/.test(code)) return null;

        const ip =
          request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          "unknown";
        if (!(await otpVerifyRateLimit(email, ip))) return null;

        // Consumul e atomic (deleteMany): două cereri concurente cu același cod
        // — doar una câștigă, cealaltă primește count 0.
        const deleted = await prisma.verificationToken.deleteMany({
          where: { email, token: code, expires: { gt: new Date() } },
        });
        if (deleted.count === 0) return null;

        await otpVerifyRateLimitSuccess(email, ip);

        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          try {
            const otpName =
              email.split("@")[0].replace(/[._\-+]+/g, " ").trim() || "Elev";
            const { username: base } = buildUsername(otpName, email);
            user = await prisma.user.create({
              data: {
                email,
                name: otpName,
                username: await uniqueUsername(base),
                passwordHash: crypto.randomUUID(),
                emailVerified: new Date(),
              },
            });
          } catch (err) {
            // Cursă de creare concurentă (P2002) — reia căutarea.
            user = await prisma.user.findUnique({ where: { email } });
            if (!user) throw err;
          }
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
        const email = user.email.toLowerCase();
        const existing = await prisma.user.findUnique({
          where: { email },
        });
        if (existing) {
          if (!existing.image && user.image) {
            await prisma.user.update({
              where: { id: existing.id },
              data: { image: user.image },
            });
          }
        } else {
          const googleName = user.name ?? email.split("@")[0];
          const { username: base } = buildUsername(googleName, email);
          await prisma.user.create({
            data: {
              email,
              name: googleName,
              username: await uniqueUsername(base),
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
        // Utilizatorul a fost șters din DB — nu mai minta identitate.
        delete token.id;
        delete token.role;
        delete token.name;
        token.picture = null;
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
      const protectedPaths = ["/dashboard", "/progres", "/subiecte-bac", "/cont"];
      const isProtected = protectedPaths.some(
        (p) => pathname === p || pathname.startsWith(p + "/")
      );
      if (isProtected) {
        return isLoggedIn;
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
