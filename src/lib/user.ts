export function hasPassword(passwordHash: string) {
  return passwordHash.startsWith("$2");
}
