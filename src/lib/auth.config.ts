import type { NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  otpVerifyRateLimit,
  otpVerifyRateLimitSuccess,
  clientIp,
} from "@/lib/rate-limit";
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
  adapter: PrismaAdapter(prisma),
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

        // Conturile fără parolă (create prin Google) nu se pot autentica cu parolă.
        if (!user.passwordHash) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        // Conturile neactivate (email neverificat) nu se pot autentica cu parolă.
        if (!user.emailVerified) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
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

        const ip = clientIp(request?.headers ?? { get: () => null });
        if (!(await otpVerifyRateLimit(email, ip))) return null;

        // Consumul e atomic (deleteMany): două cereri concurente cu același cod
        // — doar una câștigă, cealaltă primește count 0.
        const deleted = await prisma.otpToken.deleteMany({
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
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const email = user.email.toLowerCase();

        // Cont deja legat la o adresă Google (inclusiv după schimbarea adresei
        // Google în setări — atunci getByEmail nu l-ar mai găsi).
        const linked = await prisma.user.findUnique({
          where: { googleEmail: email },
        });
        if (linked) {
          // Adapter-ul a putut crea un duplicat pentru noul email Google înainte
          // de acest callback. Îl curățăm: mutăm contul OAuth pe contul real și
          // ștergem duplicatul gol (creat în același request, deci fără activitate).
          const dup = await prisma.user.findUnique({ where: { email } });
          if (dup && dup.id !== linked.id) {
            await prisma.account.updateMany({
              where: { userId: dup.id },
              data: { userId: linked.id },
            });
            const dupHasActivity = await prisma.projectActivity.count({
              where: { userId: dup.id },
            });
            if (dupHasActivity === 0) {
              await prisma.user.delete({ where: { id: dup.id } });
            }
          }

          await prisma.user.update({
            where: { id: linked.id },
            data: {
              googleLinked: true,
              googleEmail: email,
              // Contul a fost găsit doar prin googleEmail: emailul din cont a
              // fost schimbat în setări. Îl sincronizăm înapoi la adresa
              // Google (verificată de Google, deci sigură).
              ...(linked.email !== email ? { email } : {}),
              ...(!linked.image && user.image ? { image: user.image } : {}),
            },
          });
          return true;
        }

        // Adapter-ul l-a găsit (sau l-a creat deja) după adresa de email.
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          await prisma.user.update({
            where: { id: existing.id },
            data: {
              googleLinked: true,
              googleEmail: email,
              ...(!existing.image && user.image ? { image: user.image } : {}),
            },
          });
          return true;
        }

        // Fallback de siguranță: cu adapter, user-ul + contul OAuth se creează
        // înainte de acest callback, deci aici nu ar trebui să ajungem. Păstrăm
        // pentru robustețe (ex. viitor flux care nu folosește adapter-ul).
        try {
          const googleName = user.name ?? email.split("@")[0];
          const { username: base } = buildUsername(googleName, email);
          const created = await prisma.user.create({
            data: {
              email,
              name: googleName,
              username: await uniqueUsername(base),
              image: user.image ?? null,
              emailVerified: new Date(),
              googleLinked: true,
              googleEmail: email,
            },
          });
          if (account.providerAccountId) {
            await prisma.account.create({
              data: {
                userId: created.id,
                type: account.type ?? "oauth",
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            });
          }
        } catch (err) {
          // Cursă de creare concurentă (P2002) — dacă alt request a creat deja
          // contul, sincronizăm și continuăm normal.
          if ((err as { code?: string }).code === "P2002") {
            const raced = await prisma.user.findFirst({
              where: { OR: [{ email }, { googleEmail: email }] },
            });
            if (raced) {
              await prisma.user.update({
                where: { id: raced.id },
                data: {
                  googleLinked: true,
                  googleEmail: email,
                  emailVerified: new Date(),
                  ...(!raced.image && user.image ? { image: user.image } : {}),
                },
              });
              return true;
            }
          }
          throw err;
        }
      }
      return true;
    },
    async jwt({ token }) {
      // Pozele încărcate local (data URL, mari) nu au ce căuta în JWT —
      // header-ul cookie ar depăși limita (HTTP 431). Păstrăm doar URL-urile
      // mici (ex. avatare Google). Permisiunile nu se mai pun în token: se
      // citesc fresh din DB la fiecare cerere (callback-ul session).
      if (token.picture && token.picture.startsWith("data:image")) {
        token.picture = null;
      }
      return token;
    },
    async session({ session, token, user }) {
      const userId = (user?.id as string | undefined) ?? token.sub;
      if (session.user && userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isOwner: true,
            permissions: true,
          },
        });
        if (dbUser) {
          session.user.id = dbUser.id;
          session.user.role = dbUser.role;
          session.user.email = dbUser.email;
          session.user.name = dbUser.name;
          session.user.image = (token.picture as string | null) ?? null;
          session.user.isOwner = dbUser.isOwner;
          session.user.permissions = dbUser.permissions;
        } else {
          // Utilizatorul a fost șters din DB — nu mai mint identitate.
          session.user.id = "";
          session.user.role = "USER";
          session.user.email = "";
          session.user.name = null;
          session.user.image = null;
          session.user.isOwner = false;
          session.user.permissions = [];
        }
      }
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      // Gate-ul de rol ADMIN nu mai stă aici pe DB: admin layout-ul
      // (`(admin)/admin/layout.tsx`) verifică rolul și redirecționează, iar
      // acțiunile server enforcează permisiunile live. Middleware-ul rămâne
      // doar un gate de identitate.
      const protectedPaths = ["/admin", "/dashboard", "/progres", "/subiecte-bac", "/cont"];
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
