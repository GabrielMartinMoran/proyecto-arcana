# Parte 2: Diseño Avanzado de Criaturas

Si bien el bestiario proporcionado ofrece una amplia variedad de enemigos, puede que desees crear tus propias criaturas únicas para poblar tu mundo o representar amenazas específicas de tu campaña. Esta sección te guiará a través de un sistema flexible para diseñar monstruos desde cero, asegurando que se integren de manera balanceada con el sistema de Rangos y Presupuestos de Encuentro.

Utilizaremos un método de "compra" de estadísticas y habilidades llamado **Puntos de Perfil (PPF)**. Cada Rango de Monstruo tiene un presupuesto de PPF que puedes gastar para definir sus capacidades, permitiéndote crear desde frágiles "cañones de cristal" hasta resistentes "tanques" o astutos "controladores", todo dentro de un marco equilibrado.

### Paso 1: Concepto, Rol y Rango

Asigna un Rango (1 a 6) y obtén el Presupuesto de PPF.

| Rango del Monstruo | Presupuesto (PPF) | Rol Sugerido                                                |
| :----------------- | :---------------- | :---------------------------------------------------------- |
| **Rango 1**        | 8 PPF             | Secuaces, hordas, bestias menores.                          |
| **Rango 2**        | 12 PPF            | Infantería de élite, tenientes, monstruos peligrosos.       |
| **Rango 3**        | 17 PPF            | Jefes de mazmorra, guardianes poderosos, amenazas de élite. |
| **Rango 4**        | 23 PPF            | Jefes de arco argumental, monstruos legendarios menores.    |
| **Rango 5**        | 30 PPF            | Amenazas de final de campaña, avatares del apocalipsis.     |
| **Rango 6**        | 38 PPF            | Jefes finales épicos, diseñados a medida.                   |

### Paso 2: Distribuir PPF en Estadísticas

Usa la tabla del Rango correspondiente. Recuerda los **Límites de Gasto (Cotas)** por atributo.

#### Tabla de Constructor: Monstruo de RANGO 1 (Presupuesto: 8 PPF / Límite por Atributo: 4 PPF)

| Coste (PPF)  | Salud | Esquiva | Ataque / ND | Daño Prom. (ST) (Redondeado hacia abajo) | Mit. Física | Mit. Mágica |
| :----------: | :---: | :-----: | :---------: | :--------------------------------------: | :---------: | :---------: |
| **0 (Base)** |   4   |    6    |   +2 / 7    |                   1-2                    |      0      |      0      |
|    **1**     |   7   |    7    |   +3 / 8    |                    3                     |      0      |      0      |
|    **2**     |  10   |    -    |      -      |                    4                     |      1      |      0      |
|    **3**     |  13   |    8    |   +4 / 9    |                    5                     |      -      |      1      |
|    **4**     |  16   |    -    |      -      |                    6                     |      -      |      -      |

#### Tabla de Constructor: Monstruo de RANGO 2 (Presupuesto: 12 PPF / Límite por Atributo: 6 PPF)

| Coste (PPF)  | Salud | Esquiva | Ataque / ND | Daño Prom. (ST) (Redondeado hacia abajo) | Mit. Física | Mit. Mágica |
| :----------: | :---: | :-----: | :---------: | :--------------------------------------: | :---------: | :---------: |
| **0 (Base)** |  15   |    7    |   +3 / 8    |                   0-4                    |      0      |      0      |
|    **1**     |  20   |    8    |   +4 / 9    |                   5-6                    |      0      |      0      |
|    **2**     |  25   |    -    |   +5 / 10   |                   7-8                    |      1      |      0      |
|    **3**     |  30   |    9    |      -      |                   9-10                   |      1      |      1      |
|    **4**     |  35   |    -    |   +6 / 11   |                  11-12                   |      2      |      1      |
|    **5**     |  40   |   10    |      -      |                  13-14                   |      -      |      -      |
|    **6**     |  45   |    -    |      -      |                  15-16                   |      -      |      -      |

_(Daño redondeado al entero más cercano)_

#### Tabla de Constructor: Monstruo de RANGO 3 (Presupuesto: 17 PPF / Límite por Atributo: 8 PPF)

| Coste (PPF)  | Salud | Esquiva | Ataque / ND | Daño Prom. (ST) (Redondeado hacia abajo) | Mit. Física | Mit. Mágica |
| :----------: | :---: | :-----: | :---------: | :--------------------------------------: | :---------: | :---------: |
| **0 (Base)** |  30   |    7    |   +4 / 9    |                   0-8                    |      0      |      0      |
|    **1**     |  38   |    8    |   +5 / 10   |                   9-11                   |      0      |      0      |
|    **2**     |  46   |    -    |   +6 / 11   |                  12-14                   |      1      |      0      |
|    **3**     |  54   |    9    |      -      |                  15-17                   |      1      |      1      |
|    **4**     |  62   |    -    |   +7 / 12   |                  18-20                   |      2      |      1      |
|    **5**     |  70   |   10    |      -      |                  21-23                   |      2      |      2      |
|    **6**     |  78   |    -    |      -      |                  24-26                   |      3      |      -      |
|    **7**     |  86   |    -    |      -      |                  27-29                   |      -      |      -      |
|    **8**     |  94   |    -    |      -      |                  30-32                   |      -      |      -      |

#### Tabla de Constructor: Monstruo de RANGO 4 (Presupuesto: 23 PPF / Límite por Atributo: 10 PPF)

| Coste (PPF)  | Salud | Esquiva | Ataque / ND | Daño Prom. (ST) (Redondeado hacia abajo) | Mit. Física | Mit. Mágica |
| :----------: | :---: | :-----: | :---------: | :--------------------------------------: | :---------: | :---------: |
| **0 (Base)** |  60   |    8    |   +5 / 10   |                   0-12                   |      0      |      0      |
|    **1**     |  70   |    9    |   +6 / 11   |                  13-16                   |      0      |      0      |
|    **2**     |  80   |    -    |   +7 / 12   |                  17-20                   |      1      |      1      |
|    **3**     |  90   |   10    |      -      |                  21-24                   |      1      |      1      |
|    **4**     |  100  |    -    |   +8 / 13   |                  25-28                   |      2      |      2      |
|    **5**     |  110  |   11    |      -      |                  29-32                   |      2      |      2      |
|    **6**     |  120  |    -    |      -      |                  33-36                   |      3      |      3      |
|    **7**     |  130  |    -    |      -      |                  37-40                   |      3      |      -      |
|    **8**     |  140  |    -    |      -      |                  41-44                   |      4      |      -      |
|    **9**     |  150  |    -    |      -      |                  45-48                   |      -      |      -      |
|    **10**    |  160  |    -    |      -      |                  49-52                   |      -      |      -      |

#### Tabla de Constructor: Monstruo de RANGO 5 (Presupuesto: 30 PPF / Límite por Atributo: 12 PPF)

| Coste (PPF)  | Salud | Esquiva | Ataque / ND | Daño Prom. (ST) (Redondeado hacia abajo) | Mit. Física | Mit. Mágica |
| :----------: | :---: | :-----: | :---------: | :--------------------------------------: | :---------: | :---------: |
| **0 (Base)** |  100  |    8    |   +6 / 11   |                   0-20                   |      1      |      0      |
|    **1**     |  112  |    9    |   +7 / 12   |                  21-25                   |      1      |      1      |
|    **2**     |  124  |   10    |   +8 / 13   |                  26-30                   |      2      |      1      |
|    **3**     |  136  |    -    |      -      |                  31-35                   |      2      |      2      |
|    **4**     |  148  |   11    |   +9 / 14   |                  36-40                   |      3      |      2      |
|    **5**     |  160  |    -    |      -      |                  41-45                   |      3      |      3      |
|    **6**     |  172  |   12    |      -      |                  46-50                   |      4      |      3      |
|    **7**     |  184  |    -    |      -      |                  51-55                   |      4      |      4      |
|    **8**     |  196  |    -    |      -      |                  56-60                   |      5      |      -      |
|    **9**     |  208  |    -    |      -      |                  61-65                   |      -      |      -      |
|    **10**    |  220  |    -    |      -      |                  66-70                   |      -      |      -      |
|    **11**    |  232  |    -    |      -      |                  71-75                   |      -      |      -      |
|    **12**    |  244  |    -    |      -      |                  76-80                   |      -      |      -      |

#### Tabla de Constructor: Monstruo de RANGO 6 (Presupuesto: 38 PPF / Límite por Atributo: 14 PPF)

_(Para Jefes Finales Épicos)_

| Coste (PPF)  | Salud | Esquiva | Ataque / ND | Daño Prom. (ST) (Redondeado hacia abajo) | Mit. Física | Mit. Mágica |
| :----------: | :---: | :-----: | :---------: | :--------------------------------------: | :---------: | :---------: |
| **0 (Base)** |  150  |    9    |   +7 / 12   |                   0-30                   |      2      |      1      |
|    **1**     |  165  |   10    |   +8 / 13   |                  31-35                   |      2      |      2      |
|    **2**     |  180  |   11    |   +9 / 14   |                  36-40                   |      3      |      2      |
|    **3**     |  195  |   12    |  +10 / 15   |                  41-45                   |      3      |      3      |
|    **4**     |  210  |    -    |      -      |                  46-50                   |      4      |      3      |
|    **5**     |  225  |   13    |      -      |                  51-55                   |      4      |      4      |
|    **6**     |  240  |    -    |  +11 / 16   |                  56-60                   |      5      |      4      |
|    **7**     |  255  |    -    |      -      |                  61-65                   |      5      |      5      |
|    **8**     |  270  |    -    |      -      |                  66-70                   |      6      |      5      |
|    **9**     |  285  |   14    |      -      |                  71-75                   |      6      |      6      |
|    **10**    |  300  |    -    |      -      |                  76-80                   |      7      |      -      |
|    **11**    |  315  |    -    |      -      |                  81-85                   |      -      |      -      |
|    **12**    |  330  |    -    |      -      |                  86-90                   |      -      |      -      |
|    **13**    |  345  |    -    |      -      |                  91-95                   |      -      |      -      |
|    **14**    |  360  |    -    |      -      |                  96-100                  |      -      |      -      |

### Paso 3: Comprar Habilidades

Gasta los PPF restantes de tu presupuesto en habilidades, diferenciando entre Sabor y Táctica.

#### A. Habilidades de Sabor (Coste: 0 PPF)

Describen _cómo_ se aplica el daño o añaden elementos narrativos. No tienen coste si no alteran la táctica del combate.

- **Ejemplos:** `Asalto Múltiple` (si solo divide el Daño Promedio comprado), `Furia` (si el bono de daño ya está promediado en el Daño Promedio), `Ataque Venenoso` (si el daño del veneno está incluido en el Daño Promedio), `Visión en la Oscuridad`, tipo de daño elemental.

#### B. Rasgos Tácticos (Coste en PPF)

Habilidades que cambian las reglas del combate: Control, Movimiento Superior, Defensas Especiales, Reacciones, etc.

**Reglas de Compra:**

1.  **Límite de Rango:** Un monstruo **no puede** comprar un Rasgo Táctico de un Rango superior al suyo.
2.  **Comprar "Hacia Abajo":** Sí puede comprar Rasgos de Rangos inferiores.
3.  **Coste Fijo:** El coste depende del Rango del Rasgo.

**Tabla de Costes de Rasgos Tácticos:**

| Tipo de Habilidad            | Coste en PPF | Quién puede comprarlo       |
| :--------------------------- | :----------- | :-------------------------- |
| **Rasgo Táctico de Rango 1** | 2 PPF        | Monstruos de Rango 1, 2, 3+ |
| **Rasgo Táctico de Rango 2** | 3 PPF        | Monstruos de Rango 2, 3+    |
| **Rasgo Táctico de Rango 3** | 4 PPF        | Monstruos de Rango 3+       |
| **Rasgo Táctico de Rango 4** | 5 PPF        | Monstruos de Rango 4+       |
| **Rasgo Táctico de Rango 5** | 6 PPF        | Monstruos de Rango 5+       |
| **Rasgo Táctico de Rango 6** | 7 PPF        | Solo Monstruos de Rango 6   |

### Paso 4: La Filosofía de Rasgos Tácticos por Rango

- **Rasgos R1:** Efectos simples (Control blando menor, debuff simple, reacción defensiva, resistencia).
- **Rasgos R2:** Impacto táctico (Control blando, AoE táctico, movilidad táctica, puzzle, reacción).
- **Rasgos R3:** Alteran el campo (Control duro, AoE control, movilidad superior, negación recursos).
- **Rasgos R4:** Alteran reglas (Control duro AoE, invisibilidad+, muerte condicional, entorno).
- **Rasgos R5:** Alteran campaña (Manipulación acciones, inmunidades, ignora-defensas, mecánicas complejas).
- **Rasgos R6:** Poderes divinos o cósmicos, alteración masiva de la realidad, múltiples fases.

### Paso 5: Nota sobre Daño de Área (AoE)

- El `Daño Promedio (ST)` de las tablas es referencia **single-target**.
- El daño _por objetivo_ de un ataque AoE debería ser aproximadamente **60-70%** de esa referencia.
- Al calcular los PPF para un atacante AoE, usa el daño _por objetivo_ (asumiendo 2-3 objetivos) para determinar el `Daño Promedio (ST)` efectivo que estás comprando.

### Paso 6: Poniéndolo en Práctica (Ejemplos Finales)

> **Ejemplo 1: Berserker R2 (12 PPF / Límite 6)**
>
> - **Habilidad (3 PPF):** `Ataque Temerario` (Rasgo R2) -> 3 PPF.
> - **Sabor (0 PPF):** `Asalto Múltiple` (2 ataques), `Furia`.
> - **Stats (9 PPF):**
>   - Daño: 4 PPF -> 6 Daño Prom. ST (2x Atq de 3 Dmg base, Furia añade +2).
>   - Ataque: 4 PPF -> +5 / ND 9
>   - Salud: 1 PPF -> 6 PS
> - **Total:** 3(Hab) + 4(Dmg) + 4(Atq) + 1(PS) = 12 PPF.
> - **Final:** PS 6, Esq 6, Mit 0, Atq +5, Daño 6 (2x3, +2 con Furia). Rasgo: `Ataque Temerario`.

> **Ejemplo 2: Guardia Tanque R2 (12 PPF / Límite 6)**
>
> - **Habilidad (3 PPF):** `Protección` (Rasgo R2) -> 3 PPF.
> - **Stats (9 PPF):**
>   - Salud: 5 PPF -> 30 PS
>   - Mit. Física: 3 PPF -> 3 Mit. Física
>   - Esquiva: 1 PPF -> 7 Esq
> - **Total:** 3(Hab) + 5(PS) + 3(MitF) + 1(Esq) = 12 PPF.
> - **Final:** PS 30, Esq 7, Mit 3, Atq +2/ND 6 (base), Daño 0 (base). Rasgo: `Protección`.