# Guía de Diseño de Conjuros y Habilidades

## El Triángulo del Balance

El diseño de un conjuro en ARCANA equilibra **Poder** (daño), **Utilidad** (efectos) y **Fiabilidad** (recarga). Un conjuro no puede tenerlo todo al máximo.

### Paso 1: Establecer el Daño Base por Nivel

Esta tabla muestra el daño para una **Acción** con **Recarga Estándar (4+/5+)**.

| Nivel | Daño Single-Target (ST) | Promedio ST | Daño en Área (AoE) | Promedio AoE | Rol Táctico                        |
| :---- | :---------------------- | :---------- | :----------------- | :----------- | :--------------------------------- |
| **1** | 1d8                     | 4.5         | 1d6                | 3.5          | Daño base.                         |
| **2** | 2d8                     | 9           | 2d6                | 7            | Mejora lineal.                     |
| **3** | 4d8                     | 18          | 4d6                | 14           | **Salto de Poder.**                |
| **4** | 6d8                     | 27          | 6d6                | 21           | Daño fuerte. Recarga alta (6+).    |
| **5** | 10d8                    | 45          | 8d6                | 28           | **Ultimate.** Recarga límite (8+). |

---

### Paso 2: Añadir Utilidad y Ajustar el Coste

Añadir efectos tiene un precio en daño o dificultad.

#### **A. Efectos Leves (Coste: 0)**

Beneficios narrativos o menores. **No reducen el daño.**

- _Ejemplos:_ Empujar 1m, cambiar elemento, luces/sonidos.

#### **B. Efectos Moderados (Coste: Reducir Dado o +1 Recarga)**

Efectos tácticos breves.

- **Ajuste:** Reduce el tamaño del dado (**d8→d6**, **d6→d4**).
  - _Nota:_ Un conjuro de Área (Base d6) con control pasa a hacer daño **d4**.
- _Ejemplos:_ Terreno difícil, Ceguera (1 turno), Desventaja (1 ataque).

#### **C. Efectos Fuertes o Persistencia (Coste: -1 Nivel de Daño)**

Control duro o daño que se repite cada turno (Zonas). Requieren **Concentración**.

- **Ajuste:** Usa el daño base del **Nivel Inferior** (ej: Un Nivel 3 hace daño de Nivel 2).
- _Ejemplos:_ Inmovilizar, Aturdir, Muros de daño, Invisibilidad.

#### **D. Versatilidad (Coste: +1 Recarga)**

Elegir modo/elemento al lanzar. Aumenta la Recarga base en +1.

---

### Paso 3: Ajustar la Fiabilidad (Recarga)

- **Baja (3+):** Daño moderado/Spam. (75% éxito).
- **Estándar (4+/5+):** Balance habitual Nivel 1-3. (50-62%).
- **Alta (6+):** Efectos potentes o Nivel 4. (37%).
- **Límite (8+):** Ultimates Nivel 5. (12.5%).

**Nota sobre Economía de Acción:**

- **Interacción:** Solo utilidad menor o daño residual (máx 1d4). Nunca control fuerte.
- **Reacción:** Solo defensa o castigo inmediato. Recargas medias.

---

### Poniéndolo Todo Junto: Un Ejemplo de Diseño

Este ejemplo ilustra el proceso mental para crear un conjuro nuevo usando las reglas v2.0. Queremos crear un conjuro de **Nivel 2** para el Arcanista llamado `Prisión de Hielo`.

1.  **Concepto:** Un conjuro que daña y atrapa a un solo enemigo (Single Target).
2.  **Daño Base:** Consultamos la Tabla. Para Nivel 2 Single-Target (ST), el daño base es **2d8**.
3.  **Añadir Efecto:** Queremos que el objetivo quede **Inmovilizado**.
    - Consultamos la guía: Inmovilizar es un **Efecto Fuerte**.
    - **Coste:** El daño se reduce al del nivel inferior (Nivel 1).
    - **Ajuste:** El daño baja a **1d8**.
4.  **Establecer Recarga:** Es un conjuro de Nivel 2 estándar. La Recarga base es **4+**.
5.  **Conjuro Base Terminado:**

    > **`Prisión de Hielo` (Nivel 2 ST):** El objetivo debe superar una TS de Cuerpo. Si falla, recibe **1d8 de daño de Frío** y queda **Inmovilizado**. Requiere **Concentración**. **Recarga 4+**.

6.  **Crear Variantes (Ajustando la Fiabilidad):**
    - **Versión "Avalancha" (Más Poder):** Queremos recuperar el daño de 2d8. Pagamos el coste subiendo la dificultad de recarga (+2 pasos).
      - _Resultado:_ **2d8** daño + Inmovilizado. **Recarga 6+**.
    - **Versión "Escarcha Eterna" (Más Fiabilidad):** Queremos que sea muy fácil de recargar (3+). Pagamos el coste bajando el dado de daño (d8 -> d6).
      - _Resultado:_ **1d6** daño + Inmovilizado. **Recarga 3+**.

---

### Nota de Diseño: ¿Carta de Efecto o Activable?

Al crear nuevas habilidades u objetos mágicos, una de las decisiones más importantes es si deben ocupar una de las preciadas **Ranuras de Cartas Activas** del jugador o funcionar pasivamente desde la **Colección (Efecto)**.

El sistema ARCANA ya mitiga la falta de espacio otorgando ranuras extra a los lanzadores de conjuros, pero como DJ debes cuidar no saturar la economía del jugador.

**Hazla Activable si:**

- Inflige daño directo o aplica estados de combate (Aturdir, Cegar).
- Otorga una ventaja táctica inmediata en el turno (Teletransporte, Curación, Escudos).
- Es una habilidad que requiere una decisión táctica de "gastar un recurso" (Recarga).

**Hazla de Efecto si:**

- Es utilidad narrativa, social o de exploración (Luz, Idiomas, Detectar).
- Es un bono pasivo constante (+1 a una habilidad, Visión en la Oscuridad).
- Modifica una habilidad existente que ya ocupa ranura ("Tus bolas de fuego queman 1 turno extra").

**La Regla de Oro:** Si el jugador lo usará para ganar en combate, es **Activable**. Si lo usará para resolver el mundo o personalizar su estilo, es **Efecto**.