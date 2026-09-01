# Primitive și integrala definită

## Primitivă

$F$ primitivă pentru $f$ pe $I$ dacă $F'(x)=f(x)$, $\forall x\in I$. Mulțimea primitivelor:

$$\int f(x)dx = F(x)+C$$

## Tabel

$$\int x^n dx=\frac{x^{n+1}}{n+1},\quad \int e^x dx=e^x,\quad \int \sin x dx=-\cos x,\quad \int \cos x dx=\sin x,\quad \int \frac1x dx=\ln|x|$$

## Metode

- Integrare prin părți: $\int u v' = uv - \int u' v$
- Schimbare de variabilă: $\int f(g(x))g'(x)dx = \int f(u)du$

## Integrala definită

$$\int_a^b f(x)dx = F(b)-F(a)$$ (Leibniz-Newton)

## Aplicații

- Arie: $A=\int_a^b |f(x)|dx$ (când $f\ge0$) sau $A=\int_a^b (f-g)dx$ între grafice
- Volum corp de rotație: $V=\pi\int_a^b f^2(x)dx$
- Limite de șiruri: $\lim \frac1n\sum f(k/n)=\int_0^1 f(x)dx$

> **Capcană:** Verifică domeniile (logaritm, radical) înainte de integrare.

## Exemplu

$\int_0^1 x e^x dx = [x e^x]_0^1 - \int_0^1 e^x dx = e - (e-1)=1$.
