# Sesiuni JWT cu autorizare live din DB

Bug-ul original: promovarea/demovarea unui admin sau schimbarea permisiunilor nu se reflectau fără re-login, pentru că rolul și permisiunile erau înghețate în JWT la login. Am încercat `session.strategy = "database"` (cu `@auth/prisma-adapter`), dar `@auth/core@0.41.3` (next-auth 5.0.0-beta.32) **nu suportă database sessions pentru providerul `credentials`** (parolă + cod OTP): ramura de callback encodează mereu un JWT în cookie și nu scrie un rând în `Session`, iar citirea ulterioară a sesiunii (care caută în DB după `sessionToken`) eșuează (HTTP 431 pe cookie-ul chunked de ~55KB). Am decis: sesiuni **JWT cu identitate doar** (sub/email/name/picture mic), iar autorizarea (Rol, `isOwner`, Permisiuni) se citește **live din DB la fiecare cerere**, atât în `session` callback cât și în `currentUser` (memoizat per-request).

## Consecințe

- Fiecare cerere care atinge sesiunea face o citire DB a userului: ~1 per cerere de pagină (proxy) + 1 per cerere RSC (deduplicată prin `cache()`) + 1 per `/api/auth/session` pe client. Cost acceptat, scalabil.
- Tokenul de sesiune trebuie să rămână mic: pozele mari (`data:image`, ~40KB) nu intră niciodată în claim-uri (altfel cookie >8KB → HTTP 431). Ele rămân doar în DB; avatarele Google (URL mic) trec prin `token.picture`.
- Middleware-ul (`proxy`) e doar un gate de identitate; gate-ul de rol ADMIN stă în `(admin)/admin/layout.tsx`, iar permisiunile sunt enforceate în acțiuni prin `requirePage/requirePermission/requireOwner`.
- Tabela `Session` a fost creată și apoi eliminată; `Account` + adapter păstrează legătura conturilor Google.