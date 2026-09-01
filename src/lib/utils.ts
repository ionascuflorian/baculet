import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { randomInt } from "node:crypto";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Cod OTP cu 6 cifre, generat criptografic sigur (nu Math.random).
export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}
