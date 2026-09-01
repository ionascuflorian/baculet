# Sisteme de ecuații liniare

## Forma

$$\begin{cases} a_{11}x+a_{12}y+a_{13}z=b_1 \\ a_{21}x+a_{22}y+a_{23}z=b_2 \\ a_{31}x+a_{32}y+a_{33}z=b_3 \end{cases}$$

Notăm $A$ matricea coeficienților, $X$ vectorul necunoscutelor, $B$ vector coloană.

## Metoda Cramer

Dacă $\det A \neq 0$ (sistem Cramer):

$$x=\frac{\det A_x}{\det A},\quad y=\frac{\det A_y}{\det A},\quad z=\frac{\det A_z}{\det A}$$

unde $A_x$ se obține înlocuind coloana lui $x$ cu $B$.

## Clasificare

- $\det A \neq 0$: soluție unică
- $\det A=0$, $\det A_x=\det A_y=\det A_z=0$: compatibil nedeterminat (infinit)
- $\det A=0$, cel puțin un determinant caracteristic $\neq 0$: incompatibil

## Gauss

Triunghiularizare prin operații pe linii → rezolvare regresivă.

> **Sfat Bac:** Rezolvă întâi determinantul principal; dacă e 0, nu mai aplica Cramer direct.

## Exemplu

Sistem $ \begin{cases} x+y=3 \\ x-y=1 \end{cases}$ → $x=2, y=1$, $\det A=-2\neq0$.
