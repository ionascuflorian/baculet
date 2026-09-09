import { revalidatePath, revalidateTag } from "next/cache";

/**
 * Seam unic de invalidare. Două reguli:
 * 1. Acțiunile care schimbă progres au voie să atingă DOAR aceste funcții,
 *    nu liste de path-uri aruncate în corpurile acțiunilor.
 * 2. Când un obiect de date primește caching persistent, tag-ul lui se
 *    declară aici cu revalidateTag din funcția de invalidare corespunzătoare.
 */

export const THEMES_TAG = "themes";

/** Suprafețele de progres ale buclei de învățare + path-ul originar. */
export function revalidateLearning(path: string) {
  revalidatePath(path);
  revalidatePath("/dashboard");
  revalidatePath("/progres");
  revalidatePath("/materii");
}

/** Orice mutație de teme: admin + picker + cache-ul de teme active. */
export function revalidateTheme() {
  revalidatePath("/admin/teme");
  revalidatePath("/cont");
  revalidateTag(THEMES_TAG, "max");
}

/** Programul probelor de bac: birocrație admin + widget-ul din dashboard. */
export function revalidateBacSchedule() {
  revalidatePath("/admin/bac");
  revalidatePath("/dashboard");
}