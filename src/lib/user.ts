export function hasPassword(passwordHash: string | null): passwordHash is string {
  return passwordHash != null && passwordHash.startsWith("$2");
}
