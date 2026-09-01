# Permutări, aranjamente, combinări și Binomul lui Newton

## Permutări

$$P_n = n! = 1\cdot 2 \cdot \ldots \cdot n$$

Numărul de ordonări a $n$ elemente distincte.

## Aranjamente

$$A_n^k = \frac{n!}{(n-k)!}$$

Numărul de submulțimi ordonate cu $k$ elemente din $n$.

## Combinări

$$C_n^k = \frac{n!}{k!(n-k)!}$$

Numărul de submulțimi neordonate cu $k$ elemente. Proprietăți: $C_n^k=C_n^{n-k}$, $C_n^0=C_n^n=1$.

## Binomul lui Newton

$$(a+b)^n = \sum_{k=0}^{n} C_n^k a^{n-k} b^k$$

Termenul general: $T_{k+1}=C_n^k a^{n-k} b^k$.

## Probabilități

Pentru evenimente egal probabile:

$$P(A)=\frac{\text{nr. cazuri favorabile}}{\text{nr. cazuri posibile}}$$

> **Truc:** La Bac, problemele cu $C_n^k$ apar aproape în fiecare an la Subiectul I.5 — exersează $C_5^2=10$, $A_5^2=20$.

## Exemplu

Câte numere de 3 cifre distincte se pot forma cu cifrele 1,2,3,4,5? $A_5^3=60$.
