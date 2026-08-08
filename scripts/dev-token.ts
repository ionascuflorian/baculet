import "dotenv/config";
import { EncryptJWT, base64url, calculateJwkThumbprint } from "jose";
import { hkdf } from "@panva/hkdf";
import { randomUUID } from "crypto";
import { prisma } from "../src/lib/db";

const COOKIE_NAME = "authjs.session-token";
const ALG = "dir";
const ENC = "A256CBC-HS512";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Folosire: npm run token -- <email>");
    process.exit(1);
  }
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, role: true, image: true },
  });
  if (!user) {
    console.error("Utilizator inexistent.");
    process.exit(1);
  }
  const secret = process.env.AUTH_SECRET ?? "";
  if (!secret) {
    console.error("AUTH_SECRET lipseste.");
    process.exit(1);
  }

  // Replicăm exact @auth/core: JWE "dir" cu A256CBC-HS512 (cheie 64 octeți),
  // derivată HKDF din secret + salt = numele cookie-ului.
  const key = await hkdf(
    "sha256",
    secret,
    COOKIE_NAME,
    `Auth.js Generated Encryption Key (${COOKIE_NAME})`,
    64
  );
  const thumbprint = await calculateJwkThumbprint(
    { kty: "oct", k: base64url.encode(key) },
    "sha512"
  );

  const token = await new EncryptJWT({
    name: user.name,
    email: user.email,
    picture:
      user.image && !user.image.startsWith("data:image") ? user.image : null,
    id: user.id,
    role: user.role,
  })
    .setProtectedHeader({ alg: ALG, enc: ENC, kid: thumbprint })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
    .setJti(randomUUID())
    .encrypt(key);

  console.log(base64url.encode(COOKIE_NAME) + "|" + token);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
