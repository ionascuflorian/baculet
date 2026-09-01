# Matrice și determinanți

## Matrice

O matrice $A$ de tip $m\times n$ este un tablou cu $m$ linii și $n$ coloane. Operații:

- Adunare $A+B$ element cu element
- Înmulțire cu scalar $cA$
- Înmulțire $A\cdot B$ definită dacă $\text{coloane}(A)=\text{linii}(B)$

## Determinantul de ordin 2

$$\det \begin{pmatrix} a&b\\ c&d \end{pmatrix}=ad-bc$$

## Determinantul de ordin 3 (Sarrus)

$$\det \begin{pmatrix} a&b&c\\ d&e&f\\ g&h&i \end{pmatrix}=aei+bfg+cdh-ceg-bdi-afh$$

## Proprietăți

- $\det A^T = \det A$
- $\det(AB)=\det A \cdot \det B$
- Matrice inversabilă $\iff \det A \neq 0$

## Inversa

$$A^{-1}=\frac{1}{\det A} \cdot A^*$$

unde $A^*$ este transpusa cofactorilor.

> **La Bac II.1**: 80% din cerințe cer calcul $\det$ sau $A^n$ prin inducție.
