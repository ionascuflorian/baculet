<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Conventions

- După orice modificare de cod, pornește serverul local de dev pe port 3000 (`npm run dev`, ascuns, log în `C:\Users\unkno\AppData\Local\Temp\opencode\dev.log`) ca utilizatorul să poată testa imediat. Pentru build-uri (`npm run build`), oprește dev serverul întâi (evită `TooManyConnections` la Postgres), reconstruiește, apoi repornește dev-ul.
- **OBLIGATORIU la fiecare deploy**: bump de versiune în `package.json` (ex. `0.1.3` → `0.1.4`). Versiunea afișată pe site (footer + Cont) se sincronizează automat prin `NEXT_PUBLIC_APP_VERSION` din `next.config.ts` — NU edita manual `src/lib/version.ts` (e generat din `package.json` la build).
