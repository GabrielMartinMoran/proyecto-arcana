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

### Paso 2: Linaje de la Criatura

Asigna a la criatura un **Linaje**, una etiqueta que representa su naturaleza fundamental y permite clasificarla mecánicamente.

El Linaje puede ser utilizado por habilidades, objetos, efectos y otras reglas para determinar cómo interactúan con la criatura.

Los Linajes de criatura habituales son:

- **Humanoide:** pueblos y seres de naturaleza principalmente humanoide.
- **Goblinoide:** goblins y criaturas pertenecientes a sus estirpes o familias afines.
- **Bestia:** animales y criaturas naturales guiadas principalmente por el instinto.
- **Monstruosidad:** criaturas extraordinarias cuya naturaleza no encaja en otras categorías.
- **No-muerto:** cadáveres animados, espíritus y otras criaturas sostenidas más allá de la muerte.
- **Constructo:** seres artificiales animados mediante magia, ingeniería u otros medios.
- **Elemental:** criaturas vinculadas fundamentalmente a una fuerza o elemento primordial.
- **Feérico:** seres ligados a la magia feérica, sus dominios o su naturaleza sobrenatural.
- **Dragón:** dragones verdaderos y otras criaturas de naturaleza dracónica.
- **Gigante:** gigantes verdaderos y criaturas pertenecientes a sus estirpes.
- **Celestial:** seres originados o imbuidos por fuerzas celestiales.
- **Infernal:** seres originados o imbuidos por fuerzas infernales.
- **Aberración:** criaturas de naturaleza antinatural, alienígena o ajena a las leyes normales del mundo.
- **Planta:** criaturas vegetales animadas o conscientes.

Esta lista no es cerrada. El DJ puede crear nuevos Linajes cuando una criatura o ambientación lo requiera.

> **Importante:** el Linaje de una criatura no otorga beneficios por sí mismo, salvo cuando una regla indique expresamente lo contrario. No debe utilizarse como justificación para añadir Resistencias, Inmunidades u otros beneficios gratuitos.

### Paso 3: Distribuir PPF en Estadísticas

Usa la tabla del Rango correspondiente. Recuerda los **Límites de Gasto (Cotas)** por atributo.

### Daño Promedio por Ronda

La columna **Daño Prom. (ST)** representa el **daño promedio total que la criatura puede infligir durante una ronda mediante su ofensiva estándar contra un único objetivo**.

Este valor representa el resultado combinado de todo lo que la criatura realiza normalmente con su Acción ofensiva.

Si una criatura realiza varios ataques como parte de su Acción, el daño comprado se distribuye entre todos ellos.

**Ejemplo:** si una criatura tiene un Daño Promedio de 12 y realiza dos ataques mediante Asalto Múltiple, ambos ataques combinados deberían infligir aproximadamente 12 puntos de daño promedio por ronda.

Los Rasgos, condiciones y capacidades especiales que modifiquen sustancialmente esta producción de daño deben considerarse al evaluar el perfil ofensivo completo de la criatura.

### Ataque y Nivel de Dificultad

La columna **Ataque / ND** representa el nivel ofensivo máximo adquirido por la criatura mediante su inversión de PPF.

El valor de **Ataque** se utiliza como referencia para sus tiradas de ataque, mientras que el **ND asociado** se utiliza como referencia para las Tiradas de Salvación provocadas por sus habilidades ofensivas.

Una criatura puede utilizar valores inferiores a los adquiridos cuando una capacidad concreta representa una forma de ataque en la que es menos competente.

Por ejemplo, un poderoso conjurador puede utilizar todo su valor de Ataque / ND al lanzar magia, pero realizar ataques con una daga utilizando un bonificador menor si sus capacidades físicas son pobres.

De la misma manera, una criatura que haya adquirido **+5 / ND 10** puede poseer un ataque secundario de **+4** que provoque una Tirada de Salvación de **ND 10**. En este caso está utilizando menos precisión de la disponible, pero el ND continúa dentro de su capacidad ofensiva adquirida.

Los valores adquiridos mediante la tabla representan el techo ofensivo estándar disponible para la criatura.

#### Tabla de Constructor: Monstruo de RANGO 1 (Presupuesto: 8 PPF / Límite por Atributo: 4 PPF)

| Coste (PPF)  | Salud | Esquiva | Ataque / ND | Daño Prom. (ST) (Redondeado hacia abajo) | Puntos de Defensa (PD) / Tope | Habilidades (con Ventaja +1d4) |
| :----------: | :---: | :-----: | :---------: | :--------------------------------------: | :---------------------------: | :----------------------------: |
| **0 (Base)** |   4   |    6    |   +2 / 7    |                   1-2                    |             0 / 0             |               2                |
|    **1**     |   7   |    7    |   +3 / 8    |                    3                     |             0 / 0             |               -                |
|    **2**     |  10   |    -    |      -      |                    4                     |             1 / 1             |               3                |
|    **3**     |  13   |    8    |   +4 / 9    |                    5                     |             2 / 1             |               -                |
|    **4**     |  16   |    -    |      -      |                    6                     |             3 / 1             |               4                |

#### Tabla de Constructor: Monstruo de RANGO 2 (Presupuesto: 12 PPF / Límite por Atributo: 6 PPF)

| Coste (PPF)  | Salud | Esquiva | Ataque / ND | Daño Prom. (ST) (Redondeado hacia abajo) | Puntos de Defensa (PD) / Tope | Habilidades (con Ventaja +1d4) |
| :----------: | :---: | :-----: | :---------: | :--------------------------------------: | :---------------------------: | :----------------------------: |
| **0 (Base)** |  15   |    7    |   +3 / 8    |                   0-4                    |             0 / 0             |               2                |
|    **1**     |  20   |    8    |   +4 / 9    |                   5-6                    |             0 / 0             |               3                |
|    **2**     |  25   |    -    |   +5 / 10   |                   7-8                    |             1 / 1             |               -                |
|    **3**     |  30   |    9    |      -      |                   9-10                   |             2 / 1             |               4                |
|    **4**     |  35   |    -    |   +6 / 11   |                  11-12                   |             3 / 2             |               -                |
|    **5**     |  40   |   10    |      -      |                  13-14                   |             4 / 2             |               5                |
|    **6**     |  45   |    -    |      -      |                  15-16                   |             5 / 2             |               -                |

#### Tabla de Constructor: Monstruo de RANGO 3 (Presupuesto: 17 PPF / Límite por Atributo: 8 PPF)

| Coste (PPF)  | Salud | Esquiva | Ataque / ND | Daño Prom. (ST) (Redondeado hacia abajo) | Puntos de Defensa (PD) / Tope | Habilidades (con Ventaja +1d4) |
| :----------: | :---: | :-----: | :---------: | :--------------------------------------: | :---------------------------: | :----------------------------: |
| **0 (Base)** |  30   |    7    |   +4 / 9    |                   0-8                    |             0 / 0             |               3                |
|    **1**     |  38   |    8    |   +5 / 10   |                   9-11                   |             0 / 0             |               -                |
|    **2**     |  46   |    -    |   +6 / 11   |                  12-14                   |             1 / 1             |               4                |
|    **3**     |  54   |    9    |      -      |                  15-17                   |             2 / 1             |               -                |
|    **4**     |  62   |    -    |   +7 / 12   |                  18-20                   |             3 / 2             |               5                |
|    **5**     |  70   |   10    |      -      |                  21-23                   |             4 / 2             |               -                |
|    **6**     |  78   |    -    |      -      |                  24-26                   |             5 / 3             |               6                |
|    **7**     |  86   |    -    |      -      |                  27-29                   |             6 / 3             |               -                |
|    **8**     |  94   |    -    |      -      |                  30-32                   |             8 / 3             |               -                |

#### Tabla de Constructor: Monstruo de RANGO 4 (Presupuesto: 23 PPF / Límite por Atributo: 10 PPF)

| Coste (PPF)  | Salud | Esquiva | Ataque / ND | Daño Prom. (ST) (Redondeado hacia abajo) | Puntos de Defensa (PD) / Tope | Habilidades (con Ventaja +1d4) |
| :----------: | :---: | :-----: | :---------: | :--------------------------------------: | :---------------------------: | :----------------------------: |
| **0 (Base)** |  60   |    8    |   +5 / 10   |                   0-12                   |             0 / 0             |               3                |
|    **1**     |  70   |    9    |   +6 / 11   |                  13-16                   |             1 / 1             |               4                |
|    **2**     |  80   |    -    |   +7 / 12   |                  17-20                   |             2 / 1             |               -                |
|    **3**     |  90   |   10    |      -      |                  21-24                   |             3 / 2             |               5                |
|    **4**     |  100  |    -    |   +8 / 13   |                  25-28                   |             4 / 2             |               -                |
|    **5**     |  110  |   11    |      -      |                  29-32                   |             5 / 2             |               6                |
|    **6**     |  120  |    -    |      -      |                  33-36                   |             6 / 3             |               -                |
|    **7**     |  130  |    -    |      -      |                  37-40                   |             7 / 3             |               7                |
|    **8**     |  140  |    -    |      -      |                  41-44                   |             8 / 4             |               -                |
|    **9**     |  150  |    -    |      -      |                  45-48                   |             9 / 4             |               -                |
|    **10**    |  160  |    -    |      -      |                  49-52                   |            11 / 4             |               -                |

#### Tabla de Constructor: Monstruo de RANGO 5 (Presupuesto: 30 PPF / Límite por Atributo: 12 PPF)

| Coste (PPF)  | Salud | Esquiva | Ataque / ND | Daño Prom. (ST) (Redondeado hacia abajo) | Puntos de Defensa (PD) / Tope | Habilidades (con Ventaja +1d4) |
| :----------: | :---: | :-----: | :---------: | :--------------------------------------: | :---------------------------: | :----------------------------: |
| **0 (Base)** |  100  |    8    |   +6 / 11   |                   0-20                   |             1 / 1             |               4                |
|    **1**     |  112  |    9    |   +7 / 12   |                  21-25                   |             2 / 1             |               -                |
|    **2**     |  124  |   10    |   +8 / 13   |                  26-30                   |             3 / 2             |               5                |
|    **3**     |  136  |    -    |      -      |                  31-35                   |             4 / 2             |               -                |
|    **4**     |  148  |   11    |   +9 / 14   |                  36-40                   |             5 / 3             |               6                |
|    **5**     |  160  |    -    |      -      |                  41-45                   |             6 / 3             |               -                |
|    **6**     |  172  |   12    |      -      |                  46-50                   |             7 / 4             |               7                |
|    **7**     |  184  |    -    |      -      |                  51-55                   |             8 / 4             |               -                |
|    **8**     |  196  |    -    |      -      |                  56-60                   |             9 / 5             |               8                |
|    **9**     |  208  |    -    |      -      |                  61-65                   |            10 / 5             |               -                |
|    **10**    |  220  |    -    |      -      |                  66-70                   |            11 / 5             |               -                |
|    **11**    |  232  |    -    |      -      |                  71-75                   |            12 / 5             |               -                |
|    **12**    |  244  |    -    |      -      |                  76-80                   |            14 / 5             |               -                |

#### Tabla de Constructor: Monstruo de RANGO 6 (Presupuesto: 38 PPF / Límite por Atributo: 14 PPF)

_(Para Jefes Finales Épicos)_

| Coste (PPF)  | Salud | Esquiva | Ataque / ND | Daño Prom. (ST) (Redondeado hacia abajo) | Puntos de Defensa (PD) / Tope | Habilidades (con Ventaja +1d4) |
| :----------: | :---: | :-----: | :---------: | :--------------------------------------: | :---------------------------: | :----------------------------: |
| **0 (Base)** |  150  |    9    |   +7 / 12   |                   0-30                   |             3 / 2             |               4                |
|    **1**     |  165  |   10    |   +8 / 13   |                  31-35                   |             4 / 2             |               5                |
|    **2**     |  180  |   11    |   +9 / 14   |                  36-40                   |             5 / 3             |               -                |
|    **3**     |  195  |   12    |  +10 / 15   |                  41-45                   |             6 / 3             |               6                |
|    **4**     |  210  |    -    |      -      |                  46-50                   |             7 / 4             |               -                |
|    **5**     |  225  |   13    |      -      |                  51-55                   |             8 / 4             |               7                |
|    **6**     |  240  |    -    |  +11 / 16   |                  56-60                   |             9 / 5             |               -                |
|    **7**     |  255  |    -    |      -      |                  61-65                   |            10 / 5             |               8                |
|    **8**     |  270  |    -    |      -      |                  66-70                   |            11 / 6             |               -                |
|    **9**     |  285  |   14    |      -      |                  71-75                   |            12 / 6             |               9                |
|    **10**    |  300  |    -    |      -      |                  76-80                   |            13 / 7             |               -                |
|    **11**    |  315  |    -    |      -      |                  81-85                   |            14 / 7             |               -                |
|    **12**    |  330  |    -    |      -      |                  86-90                   |            15 / 7             |               -                |
|    **13**    |  345  |    -    |      -      |                  91-95                   |            16 / 7             |               -                |
|    **14**    |  360  |    -    |      -      |                  96-100                  |            18 / 7             |               -                |

### Regla de Diseño: La Reserva Defensiva

El Director de Juego (DJ) utiliza los **Puntos de Defensa (PD)** obtenidos en la Tabla de Constructor del Rango correspondiente para configurar el perfil defensivo de una criatura.

Los PD representan defensas especiales que van más allá de sus valores básicos de Salud y Esquiva. Una criatura puede distribuirlos entre Mitigación, Resistencias, Inmunidades, mejoras a Tiradas de Salvación y protecciones contra estados.

Para facilitar la consulta durante el diseño, las opciones se agrupan en cuatro categorías principales.

#### 1. Mitigación y Protecciones de Daño

- **Mitigación Plana (Coste: 1 PD por punto):** suma +1 a la Mitigación Física o a la Mitigación Mágica.

  > _Restricción:_ El valor individual de Mitigación Física o Mitigación Mágica no puede superar el **Tope de Mitigación** indicado en la tabla del Rango de la criatura.

- **Resistencia a Daño (Coste: 2 PD):** la criatura recibe la mitad del daño de un tipo específico, como **Fuego**, **Cortante** o **Veneno**. La Resistencia se aplica antes de restar la Mitigación Plana.

- **Inmunidad a Daño (Coste: 4 PD):** la criatura no recibe daño de un tipo específico.

  > _Restricción:_ Esta opción está reservada normalmente a criaturas de **Rango 5 o 6**, salvo que una excepción por Tipo de Criatura indique lo contrario.

- **Vulnerabilidad a Daño (Coste: -1 PD):** la criatura recibe el doble de daño de un tipo específico. Al otorgar esta debilidad, el DJ obtiene **+1 PD** adicional para gastar en otras defensas.

  > _Restricción:_ Una criatura puede poseer como máximo **1 Vulnerabilidad a Daño** adquirida de esta forma.

##### Defensas de Daño Condicionales

Cuando una **Resistencia** o **Inmunidad a Daño** solo funciona bajo una condición clara y suficientemente restrictiva, calcula primero el coste normal de todas las defensas cubiertas y reduce ese coste a la **mitad, redondeando hacia arriba**.

Para recibir este descuento, la condición debe proporcionar a los personajes una forma razonable de **evitar, desactivar o superar** la defensa.

Una condición trivial, prácticamente permanente o que los personajes no puedan razonablemente explotar **no reduce el coste**.

> **Ejemplo — Resistencia Condicional:** una criatura posee Resistencia a daño **Contundente, Cortante y Perforante de fuentes no mágicas**. Las tres Resistencias costarían normalmente 6 PD. Al aplicarse únicamente contra fuentes no mágicas, el paquete cuesta **3 PD**.
>
> **Ejemplo — Inmunidad Condicional:** una criatura es inmune a **Fuego** únicamente mientras permanece sumergida en lava. La Inmunidad costaría normalmente 4 PD; al ser condicional, cuesta **2 PD**.

#### 2. Tiradas de Salvación

- **Ventaja Condicional en TS (Coste: 1 PD):** la criatura obtiene Ventaja (+1d4) en Tiradas de Salvación contra una fuente, estado o categoría específica de efectos.
  - Ejemplos: Miedo, Venenos, efectos de Derribo o efectos que provocarían Encantado.

- **Ventaja Plana en Atributo Defensivo (Coste: 2 PD):** la criatura obtiene Ventaja (+1d4) en todas las Tiradas de Salvación asociadas a un Atributo concreto: **Cuerpo, Reflejos, Mente, Instinto o Presencia**.

  > _Restricción:_ Las criaturas de **Rango 1 y 2** solo pueden adquirir esta defensa para un máximo de **1 Atributo**.

#### 3. Inmunidad a Estados y Control

Las inmunidades a estados se dividen según el impacto táctico de aquello que permiten ignorar.

- **Inmunidad a Estado Fisiológico (Coste: 1 PD por estado):**
  - **Cegado**
  - **Derribado**
  - **Dormido**
  - **Ensordecido**
  - **Envenenado**

- **Inmunidad a Estado Táctico (Coste: 2 PD por estado):**
  - **Asustado**
  - **Encantado**
  - **Inmovilizado**

- **Inmunidad a Control Duro (Coste: 3 PD):**
  - **Aturdido**

  > _Restricción:_ La Inmunidad a Aturdido solo está disponible para criaturas de **Rango 3 o superior**.

Las inmunidades de esta sección deben adquirirse normalmente aunque parezcan apropiadas para la anatomía, comportamiento o naturaleza de una criatura, salvo que una excepción por Tipo de Criatura indique expresamente lo contrario.

#### 4. Excepciones de Linaje

Algunos Linajes poseen propiedades inherentes que modifican excepcionalmente las reglas anteriores.

Estas excepciones son específicas. **Pertenecer a un Linaje no concede otras Resistencias, Inmunidades o beneficios automáticos que no estén indicados aquí.**

> **No-muerto — Fisiología Inerte:** Las criaturas de Linaje **No-muerto** son inmunes al estado **Envenenado** sin gastar PD.

> **Constructo — Fisiología Artificial:** Las criaturas de Linaje **Constructo** son inmunes al estado **Envenenado** sin gastar PD.

> **Feérico — Mente Feérica:** Las criaturas de Linaje **Feérico** obtienen Ventaja (+1d4) en Tiradas de Salvación contra efectos que podrían dejarlas **Encantadas** sin gastar PD.

> **Elemental — Afinidad Elemental:** Una criatura de Linaje **Elemental** puede adquirir Inmunidad a Daño contra el elemento primario que constituye su naturaleza por **2 PD en lugar de 4 PD**, ignorando además la restricción habitual de Rango.

> **Dragón — Afinidad Dracónica:** Una criatura de Linaje **Dragón** con una afinidad elemental propia de su estirpe puede adquirir Inmunidad a Daño contra ese tipo de daño por **2 PD en lugar de 4 PD**, ignorando además la restricción habitual de Rango.

Los demás Linajes no reciben excepciones defensivas automáticas salvo que otra regla indique expresamente lo contrario.

### Paso 4: Comprar Habilidades

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

### Paso 5: La Filosofía de Rasgos Tácticos por Rango

- **Rasgos R1:** Efectos simples (Control blando menor, debuff simple, reacción defensiva, resistencia).
- **Rasgos R2:** Impacto táctico (Control blando, AoE táctico, movilidad táctica, puzzle, reacción).
- **Rasgos R3:** Alteran el campo (Control duro, AoE control, movilidad superior, negación recursos).
- **Rasgos R4:** Alteran reglas (Control duro AoE, invisibilidad+, muerte condicional, entorno).
- **Rasgos R5:** Alteran campaña (Manipulación acciones, inmunidades, ignora-defensas, mecánicas complejas).
- **Rasgos R6:** Poderes divinos o cósmicos, alteración masiva de la realidad, múltiples fases.

### Paso 6: Nota sobre Daño de Área (AoE)

El **Daño Promedio por Ronda (ST)** de las tablas representa la referencia ofensiva de la criatura contra un único objetivo.

Las capacidades de área distribuyen su potencial ofensivo entre varios objetivos, por lo que su daño por objetivo suele ser menor.

Como referencia:

- Un AoE **a distancia**, con buena capacidad para seleccionar dónde impacta y afectar cómodamente a varios enemigos, puede infligir aproximadamente **60-70%** del Daño Promedio por Ronda de la criatura a cada objetivo.
- Un AoE de **alcance limitado**, especialmente uno centrado en la propia criatura o que requiere colocarse a distancia Inmediata de los enemigos, puede acercarse más al daño estándar debido al riesgo y las exigencias de posicionamiento necesarias para utilizarlo.

Al diseñar un AoE, considerar conjuntamente:

- su alcance;
- el tamaño y forma del área;
- la facilidad para afectar a múltiples objetivos;
- la necesidad de exponerse o posicionarse;
- los efectos adicionales de control;
- su frecuencia de uso o Recarga.

La referencia de 60-70% funciona como punto de partida para AoE a distancia eficientes, mientras que las capacidades de área más restrictivas pueden justificar porcentajes mayores.

### Paso 7: Poniéndolo en Práctica (Ejemplos Finales)

> **Ejemplo 1: Berserker R2 (12 PPF / Límite 6)**
>
> - **Rasgo Táctico (3 PPF):** `Ataque Temerario` (Rasgo R2) → 3 PPF.
> - **Stats (9 PPF):**
>   - **Daño: 5 PPF** → 13-14 de Daño Promedio por Ronda disponible.
>   - **Ataque: 2 PPF** → +5 / ND 10.
>   - **Salud: 2 PPF** → 25 PS.
> - **Total:** 3 (Rasgo) + 5 (Daño) + 2 (Ataque) + 2 (Salud) = **12 PPF**.
>
> El Berserker utiliza **Asalto Múltiple** para realizar dos ataques como parte de su Acción. Su daño total entre ambos ataques representa el Daño Promedio por Ronda comprado, en lugar de aplicar ese valor completo a cada ataque individual.
>
> Su `Furia` aplica un bono de **+2 al daño una vez por turno a uno de sus ataques** mientras la criatura tenga la mitad de su Salud o menos.
>
> Su perfil puede representarse mediante dos ataques que infligen aproximadamente 11 puntos de daño promedio combinados en condiciones normales y aumentan hasta aproximadamente 13 mientras su `Furia` está activa.
>
> - **Final:** PS 25, Esq 7, Mit 0, Atq +5 / ND 10. Dos ataques por Acción. Daño ofensivo máximo aproximado: 13 por ronda mientras Furia está activa. Rasgo Táctico: `Ataque Temerario`.

> **Ejemplo 2: Guardia Tanque R2 (12 PPF / Límite 6)**
>
> - **Habilidad (3 PPF):** `Protección` (Rasgo R2) -> 3 PPF.
> - **Stats (9 PPF):**
>   - Salud: 3 PPF -> 30 PS
>   - Defensa: 4 PPF -> 3 PD / Tope 2, asignados como Mit. Física 2 y Mit. Mágica 1
>   - Esquiva: 1 PPF -> 8 Esq
>   - Ataque: 1 PPF -> +4 / ND 9
> - **Total:** 3(Hab) + 3(PS) + 4(Defensa) + 1(Esq) + 1(Atq) = 12 PPF.
> - **Final:** PS 30, Esq 8, Mit. Física 2, Mit. Mágica 1, Atq +4/ND 9, Daño 0 (base). Rasgo: `Protección`.