// Versiunea site-ului. Sursa de adevăr e package.json: next.config.ts o
// injectează în NEXT_PUBLIC_APP_VERSION la build — nu mai trebuie editată manual.
export const APP_VERSION = `v${process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0"}`;
