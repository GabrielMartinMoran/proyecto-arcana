# Parte 1: Diseñar Encuentros

Este sistema te permite preparar un encuentro balanceado rápidamente, basándose en el poder promedio de tu grupo y la dificultad deseada. Empodera al Director de Juego (DJ) para tomar decisiones informadas, guiado por principios en lugar de reglas estrictas.

### Paso 1: Calcular el Poder Promedio del Grupo (PP Promedio)

Primero, necesitas una medida del poder actual de tu grupo.

**PP Promedio = (Suma total de PP gastados por todos los personajes) / (Número de personajes)**

### Paso 2: Consultar la Tabla Maestra de Presupuesto por Personaje

Usa el `PP Promedio` calculado para encontrar la fila correspondiente en la siguiente tabla. Esta tabla te dará el **Presupuesto Base de Puntos de Amenaza por Personaje (PA Base/PJ)** para cada nivel de dificultad. También te ofrece una **sugerencia** sobre el Rango máximo de monstruo apropiado para encuentros estándar en ese nivel de poder.

| PP Promedio | Rango Nominal (Ref.) | PA Base/PJ (Fácil) | PA Base/PJ (Normal) | PA Base/PJ (Difícil) | PA Base/PJ (Épico) | Rango Máx. Monstruo Sugerido (Estándar) |
| :---------- | :------------------- | :----------------- | :------------------ | :------------------- | :----------------- | :-------------------------------------- |
| **0-7**     | R1 (Inicio)          | 1                  | 1.5                 | 2                    | 2.5                | Rango 1                                 |
| **8-15**    | R1 (Medio)           | 1.25               | 1.75                | 2.5                  | 3.25               | Rango 1                                 |
| **16-25**   | R1 (Avanzado)        | 1.5                | 2.25                | 3.25                 | 4.25               | Rango 1 (_Considerar 1x R2_)            |
| **26-38**   | R2 (Inicio)          | 2                  | 3                   | 4.5                  | 6                  | Rango 2                                 |
| **39-50**   | R2 (Medio)           | 2.5                | 3.75                | 5.5                  | 7.25               | Rango 2                                 |
| **51-60**   | R2 (Avanzado)        | 3                  | 4.5                 | 6.5                  | 8.5                | Rango 2 (_Considerar 1x R3_)            |
| **61-75**   | R3 (Inicio)          | 3.5                | 5                   | 7.5                  | 10                 | Rango 3                                 |
| **76-90**   | R3 (Medio)           | 4                  | 6                   | 9                    | 12                 | Rango 3                                 |
| **91+**     | R3 (Avanzado)        | 5                  | 7.5                 | 10.5                 | 14                 | Rango 3 (_Considerar 1x R4_)            |

_(Nota: "Rango Nominal (Ref.)" es solo una etiqueta de referencia para entender en qué etapa de poder se encuentra el grupo)_

### Paso 3: Calcular el Presupuesto Total del Encuentro (PA Total)

Multiplica el PA Base/PJ obtenido de la tabla por el número de jugadores en tu grupo. Redondea el resultado final al entero más cercano si obtienes decimales.

`Presupuesto Total (PA) = Redondear( (PA Base por PJ de la Tabla) x (Número de Jugadores) )`

> **Ejemplo:** Grupo de **4 Jugadores** con **PP Promedio de 95** (fila "91+"). Quieren dificultad **Difícil**.
>
> - PA Base/PJ (Tabla v5.2): 10.5 PA
> - Presupuesto Total: Redondear(10.5 PA/PJ x 4 Jugadores) = **42 PA**.

### Paso 4: Construir el Encuentro - Compra de Enemigos

Gasta tu Presupuesto Total (PA) comprando enemigos usando la siguiente tabla de costes.

| Rango de Amenaza | Coste en PA |
| :--------------- | :---------- |
| **Rango 1**      | 1 PA        |
| **Rango 2**      | 2 PA        |
| **Rango 3**      | 6 PA        |
| **Rango 4**      | 10 PA       |
| **Rango 5**      | 20 PA       |
| **Rango 6**      | 40 PA       |

_(Como DJ podrias querer crear criaturas legendarias de rangos más altos. Para esto, usa la misma filosofía y ten mucho cuidado al balancear las oportunidades de esos nuevos rangos)_

**No hay límites estrictos sobre qué Rangos puedes usar**, pero tu elección debe estar guiada por tu criterio y los principios detallados en la siguiente **Guía Estratégica**.

### Guía Estratégica para el DJ: Balance y Composición

El presupuesto de PA es tu herramienta principal, pero **tu criterio es la clave final**. Usa estos principios para interpretar el presupuesto y construir encuentros memorables y balanceados:

1.  **Conoce a tu Grupo (Regla de Oro):** Adapta la composición (número vs. Rango de enemigos) a _tu_ mesa específica. ¿Son tácticos? ¿Tienen AoE (efecto en área)? ¿Les falta curación? El "Rango Máx. Sugerido" de la Tabla Maestra es un buen punto de partida para encuentros _estándar_, pero si tu grupo tiene debilidades claras (ej. nula respuesta a voladores), sé cauto al explotarlas, incluso si el presupuesto lo permite. Un encuentro Fácil para un grupo optimizado puede ser Normal o Difícil para otro. **Tu objetivo es desafiar, no frustrar.**
2.  **Calidad sobre Cantidad (Cantidad Adecuada de Enemigos):**
    - **Objetivo:** Intenta que la mayoría de tus encuentros (Normal, Difícil) tengan una cantidad de enemigos que estre entre el numero de personajes y el doble de este valor (por ejemplo, entre 4 y 8 criaturas para un grupo de 4 personajes). Esto suele generar el mejor equilibrio entre desafío táctico y fluidez del combate, evitando turnos excesivamente largos.
    - **Gestión del Presupuesto:** Si tu presupuesto te permite comprar muchos monstruos de bajo rango (>10-12), **considera activamente gastar _menos_ del presupuesto total** o (preferiblemente) **sustituir** grupos de enemigos de bajo Rango por **uno o dos de Rango superior** (respetando las guías sobre Rangos Superiores). El coste exponencial de R4+ te ayudará naturalmente a mantener bajo el número total de enemigos en niveles altos.
    - **Hordas Intencionales:** Si buscas una sensación de asedio, puedes usar hordas (>10 R1), pero sé consciente de que alargará el combate y la economía de acciones puede ser brutal. Resérvalo para momentos clave y considera usar monstruos R1 con _muy_ baja salud (menos PPF invertidos en PS) para acelerar su resolución.
3.  **Economía de Acciones:** El bando con más acciones suele tener ventaja. Compensa la desventaja numérica de Jefes solitarios (R4+) asegurándote de que tengan buena Salud/Mitigación y **Rasgos Tácticos clave** (especialmente Reacciones, Control AoE o habilidades de Movilidad Superior) que les permitan impactar el combate significativamente más allá de su único turno.
4.  **El Peligro (y Oportunidad) de Rangos Superiores:**
    - **Coste Elevado:** Incluir monstruos R4 (5 PA), R5 (8 PA) o R6 (13 PA) consume una porción significativa de tu presupuesto. Esto limita naturalmente su número y los posiciona como amenazas centrales.
    - **Advertencia Fuerte (R+2 o más):** Usar monstruos con un Rango _dos o más niveles por encima_ del Rango Nominal del grupo es **extremadamente peligroso** y debe ser una decisión **consciente, justificada narrativamente** y reservada para encuentros **Épicos** o climáticos. Realiza siempre la **Evaluación Crítica Obligatoria** antes de hacerlo:
      - _Viabilidad:_ ¿Pueden los PJs interactuar _significativamente_ (impactar con >20% chance, superar Mitigación, sobrevivir 1-2 golpes estándar)? Un enemigo invulnerable o que mata de un golpe no es un desafío interesante.
      - _Letalidad:_ ¿Hay riesgo real de muerte _instantánea_ con ataques normales o habilidades recargables? Si es así, ¿es apropiado? ¿Puedes _telegrafiar_ (anunciar o dar pistas claras) esos ataques devastadores para dar oportunidad de reacción?
      - _Habilidades:_ ¿Son los NDs de sus habilidades _desafiantes_ (requieren 4+/5+ en d8) o _efectivamente imposibles_ para las salvaciones del grupo?
    - **Representando Jefes:** Incluir **un solo** monstruo R+1 o R+2 es la forma natural de crear un "Jefe". Su alto coste en PA reflejará su estatus.
      - _Jefe Solitario:_ Gasta gran parte o todo tu presupuesto en él. El grupo tiene ventaja de acciones, creando un duelo tenso. Suele ser apropiado para **Difícil** o **Épico**.
      - _Jefe con Secuaces:_ Gasta una parte del presupuesto en el Jefe (R+1 o R+2) y el resto en monstruos de Rango 1 (o Rango base del grupo) para dividir la atención. Es inherentemente **Épico**. Limita el número de secuaces (quizás usando un presupuesto Fácil para ellos) para no eclipsar al jefe ni alargar excesivamente el combate.
    - **Inclusión Opcional R+1:** La nota "_Considerar 1x R(N+1)_" en la Tabla Maestra indica el punto (generalmente en la segunda mitad del rango de PP) donde incluir _un solo_ enemigo del siguiente nivel en encuentros **Normales o Difíciles** empieza a ser razonable y añade variedad. Es una excelente forma de usar el presupuesto creciente sin recurrir solo a más enemigos del mismo Rango.
5.  **Sinergia Enemiga:** Criaturas cuyas habilidades se potencian entre sí (ej. uno derriba, otro ataca con ventaja a los derribados; un líder que da bonos; un controlador que agrupa enemigos para un AoE) valen "más" que la suma de sus costes individuales. Tenlo en cuenta al construir el encuentro y considera quizás gastar un poco menos del presupuesto si la sinergia es muy fuerte.
6.  **Entorno y Táctica:** No los subestimes. Úsalos activamente para modular la dificultad sin tocar el presupuesto. Una emboscada, terreno difícil para los PJs, cobertura abundante para los enemigos, peligros ambientales u objetivos secundarios (proteger a un PNJ, desactivar un artefacto) pueden hacer que un encuentro Normal se sienta Difícil o Épico.
7.  **Iteración y Flexibilidad (Tu Poder como DJ):** El presupuesto es tu punto de partida, no un grillete. **Observa a tu grupo y ajusta sobre la marcha.**
    - **Demasiado Fácil:** Introduce una segunda oleada de enemigos (gastando PA "imaginarios" si es necesario), haz que un enemigo revele una habilidad táctica inesperada (un Rasgo Táctico que no habías planeado usar), o haz que el entorno cambie (se derrumba parte del techo, se inunda la sala).
    - **Demasiado Difícil:** Haz que los enemigos cometan errores tácticos (focusear al tanque en lugar del sanador), que uno huya presa del pánico (especialmente si es un líder), o introduce un factor externo que ayude al grupo (un PNJ aliado interviene, el artefacto que buscan debilita al jefe).
    - **La Meta:** La diversión, el ritmo narrativo y un desafío apropiado para _tu_ mesa son más importantes que la adherencia matemática estricta al presupuesto calculado. Usa el sistema como tu guía, pero confía en tu instinto como DJ.
8.  **Prioriza el Desgaste sobre el "Todo o Nada":**
    - **Diseña la Jornada, no Solo el Encuentro:** Piensa en la secuencia de desafíos que el grupo enfrentará antes de su próximo descanso. Una serie de encuentros "Fáciles" y "Normales" puede ser mucho más desafiante a largo plazo que un único encuentro "Épico", ya que consumirán gradualmente los recursos limitados del grupo (usos de cartas, Puntos de Suerte, Puntos de Salud).
    - **Tensión Sostenida:** El desgaste fomenta la toma de decisiones significativas sobre cuándo usar habilidades poderosas, cuándo descansar y cómo gestionar el riesgo. Un solo combate binario (ganar o morir) puede ser emocionante, pero a la vez muy riesgoso. Pero una jornada llena de pequeños desafíos (no solo de combate) que merman al grupo crea una tensión más profunda y realista.
    - **Reserva lo Épico:** Guarda los encuentros "Difíciles" y "Épicos" para momentos climáticos (jefes de mazmorra, finales de arco argumental). No satures la aventura con picos de dificultad constantes; permite que el grupo gestione sus recursos a través de desafíos moderados. Un encuentro "Normal" se sentirá "Difícil" si el grupo ya llega sin Puntos de Suerte y con la mitad de sus cartas agotadas.

> **Ejemplo Final:** Grupo de **4 Jugadores**, **PP Promedio 95** (R3 Avanzado), Dificultad **Difícil**.
>
> - Presupuesto Total: **42 PA**. Rango Máx. Sugerido: R3 (_Considerar 1x R4_).
> - **Opción 1 (Horda R3 - Evitar):** 14x Monstruos R3 (42 PA). _Análisis: Demasiados enemigos (14), combate probablemente largo y repetitivo._
> - **Opción 2 (Jefe R4 + Élites - Recomendado):** 1x Troll R4 (5 PA) + 7x Ogros R3 (21 PA) + 8x Bandidos R2 (16 PA) = 42 PA. (16 enemigos). _Análisis: Número aún alto. Podríamos reducir._
> - **Opción 3 (Calidad sobre Cantidad):** 1x Troll R4 (5 PA) + 5x Ogros R3 (15 PA) + 6x Bandidos R2 (12 PA) = 32 PA (12 enemigos). _Análisis: Gasta menos del presupuesto, pero tiene menos enemigos y sigue siendo muy desafiante._
> - **Opción 4 (Doble Jefe R4):** 2x Troll R4 (10 PA) + 6x Ogros R3 (18 PA) + 7x Bandidos R2 (14 PA) = 42 PA. (15 enemigos). _Análisis: Muy difícil, al borde de Épico._

### Paso 5: Diseño Avanzado de Criaturas (Resumen)

Si deseas crear tus propios monstruos, la Parte 2 (detallada a continuación) te guía usando un sistema de **Puntos de Perfil (PPF)**. Cada Rango de Monstruo (1 a 6) tiene un presupuesto de PPF y tablas calibradas para "comprar" sus estadísticas y Rasgos Tácticos, asegurando que se alineen con el balance general del sistema.