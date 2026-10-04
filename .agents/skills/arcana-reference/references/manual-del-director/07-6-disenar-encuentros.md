# 6. Diseñar Encuentros

La esencia de una aventura emocionante reside en los desafíos que presenta. Esta guía te proporcionará un sistema de reglas ligeras, rápido e intuitivo para diseñar encuentros que sean justos, desafiantes y divertidos, alineados con la filosofía de ARCANA.

Este sistema te permite preparar un encuentro balanceado rápidamente, basándose en el poder promedio de tu grupo y la dificultad deseada. Empodera al Director de Juego (DJ) para tomar decisiones informadas, guiado por principios en lugar de reglas estrictas.

## Paso 1: Calcular el Poder Promedio del Grupo (PP Promedio)

Primero, necesitas una medida del poder actual de tu grupo.

**PP Promedio = (Suma total de PP gastados por todos los personajes) / (Número de personajes)**

## Paso 2: Consultar la Tabla Maestra de Presupuesto por Personaje

Usa el `PP Promedio` calculado para encontrar la fila correspondiente en la siguiente tabla. Esta tabla te dará el **Presupuesto Base de Puntos de Amenaza por Personaje (PA Base/PJ)** para cada nivel de dificultad. También te ofrece una **sugerencia** sobre el Rango máximo de monstruo apropiado para encuentros estándar en ese nivel de poder.

| PP Promedio | Rango Nominal (Ref.) | PA Base/PJ (Fácil) | PA Base/PJ (Normal) | PA Base/PJ (Difícil) | PA Base/PJ (Épico) | Rango Máx. Monstruo Sugerido (Estándar) |
| :---------- | :------------------- | :----------------- | :------------------ | :------------------- | :----------------- | :-------------------------------------- |
| **0-6**     | R1 (Inicio)          | 1                  | 1.5                 | 2                    | 2.5                | Rango 1                                 |
| **7-13**    | R1 (Medio)           | 1.25               | 1.75                | 2.5                  | 3.25               | Rango 1                                 |
| **14-22**   | R1 (Avanzado)        | 1.5                | 2.25                | 3.25                 | 4.25               | Rango 1 (_Considerar 1x R2_)            |
| **23-32**   | R2 (Inicio)          | 2                  | 3                   | 4.5                  | 6                  | Rango 2                                 |
| **33-42**   | R2 (Medio)           | 2.5                | 3.75                | 5.5                  | 7.25               | Rango 2                                 |
| **43-52**   | R2 (Avanzado)        | 3                  | 4.5                 | 6.5                  | 8.5                | Rango 2 (_Considerar 1x R3_)            |
| **53-68**   | R3 (Inicio)          | 3.5                | 5                   | 7.5                  | 10                 | Rango 3                                 |
| **69-84**   | R3 (Medio)           | 4                  | 6                   | 9                    | 12                 | Rango 3                                 |
| **85-114**  | R3 (Avanzado)        | 5                  | 7.5                 | 10.5                 | 14                 | Rango 3 (_Considerar 1x R4_)            |
| **115-139** | R4 (Inicio)          | 5.5                | 8                   | 11                   | 15                 | Rango 4                                 |
| **140-164** | R4 (Medio)           | 6.5                | 10                  | 14                   | 19                 | Rango 4                                 |
| **165-189** | R4 (Avanzado)        | 8                  | 12                  | 17                   | 23                 | Rango 4 (_Considerar 1x R5_)            |
| **190+**    | R5 (Épico)           | 10                 | 15                  | 21                   | 28                 | Rango 5 (_Considerar 1x R6_)            |

_(Nota: "Rango Nominal (Ref.)" representa la escala de amenazas frente a la cual un grupo de personajes de ese nivel de progreso puede contribuir de forma sostenida y significativa en encuentros estándar. No indica el Nivel máximo de carta que un personaje puede poseer: personajes muy especializados pueden acceder antes a capacidades propias de etapas posteriores, mientras que personajes más diversificados pueden consolidar su poder de forma más gradual.)_

## Paso 3: Calcular el Presupuesto Total del Encuentro (PA Total)

Multiplica el PA Base/PJ obtenido de la tabla por el número de jugadores en tu grupo. Redondea el resultado final al entero más cercano si obtienes decimales.

`Presupuesto Total (PA) = Redondear( (PA Base por PJ de la Tabla) x (Número de Jugadores) )`

> **Ejemplo:** Grupo de **4 Jugadores** con **PP Promedio de 95** (fila "85-114", R3 Avanzado). Quieren dificultad **Difícil**.
>
> - PA Base/PJ: 10.5 PA
> - Presupuesto Total: Redondear(10.5 PA/PJ × 4 Jugadores) = **42 PA**.

## Paso 4: Construir el Encuentro — Compra de Enemigos

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

## Mejoras de Jefe

Todas las criaturas disponen normalmente de **1 Reacción por ronda**.

Al construir un encuentro, el DJ puede adquirir **Mejoras de Jefe** para una criatura que deba actuar como una amenaza central capaz de sostener un enfrentamiento contra varios adversarios.

Cada Mejora de Jefe otorga:

- **+1 Reacción por ronda**.
- **+1 uso de Determinación de Jefe por encuentro**.

Cada Mejora aumenta el coste en PA de la criatura en un **25% de su coste base**, calculando todos los incrementos sobre el coste original y redondeando el resultado final hacia arriba.

| Mejoras de Jefe | Reacciones por Ronda | Determinaciones por Encuentro |  Coste en PA |
| :-------------- | :------------------- | :---------------------------- | -----------: |
| **0**           | 1                    | 0                             | Coste normal |
| **1**           | 2                    | 1                             |        ×1,25 |
| **2**           | 3                    | 2                             |        ×1,50 |
| **3**           | 4                    | 3                             |        ×1,75 |

Como referencia, **1 o 2 Mejoras** funcionan especialmente bien para jefes habituales. Las criaturas con **3 Mejoras** deberían reservarse normalmente para enfrentamientos particularmente importantes o finales de arco.

Una criatura no puede utilizar más de **una Reacción ante el mismo desencadenante**.

Las Mejoras de Jefe son una modificación del encuentro, no del bloque de estadísticas base de la criatura. Sus Reacciones adicionales y capacidades derivadas no deben incluirse al calcular los PPF o el Daño Promedio por Ronda de la criatura: su poder adicional ya está representado por el incremento de PA.

### Determinación de Jefe

Después de fallar una Tirada de Salvación, una criatura con usos disponibles de Determinación puede gastar **1 uso** para considerar que ha superado la tirada.

Resuelve normalmente las consecuencias correspondientes a una salvación exitosa. Por ejemplo, si un efecto inflige la mitad de daño cuando se supera la Tirada de Salvación, la criatura recibe esa mitad de daño.

Una criatura solo puede utilizar **1 Determinación por ronda**, independientemente de la cantidad de usos que conserve.

Utilizar Determinación no requiere gastar una Reacción.

### Negación de Reacciones y Jefes

Los efectos que normalmente impidan a una criatura utilizar Reacciones reducen en **1** la cantidad de Reacciones que puede utilizar por ronda, hasta un mínimo de 0, en lugar de anularlas por completo.

Para una criatura normal, que dispone de una única Reacción, esto funciona normalmente y le impide utilizar Reacciones mientras dure el efecto.

Una criatura que posea Mejoras de Jefe conserva las Reacciones restantes y puede utilizarlas normalmente, incluyendo sus Reacciones propias y las opciones de Reacción de Jefe.

Múltiples efectos que impidan utilizar Reacciones no acumulan esta reducción, salvo que una regla indique expresamente lo contrario.

### Reacciones de Jefe

Una criatura que posea al menos **1 Mejora de Jefe** obtiene automáticamente las siguientes opciones de Reacción, además de cualquier Reacción especial indicada en su bloque de estadísticas.

**Reposicionarse:** Al final del turno de otra criatura, puede usar una Reacción para moverse hasta la mitad de su Velocidad.

**Ataque Rápido:** Al final del turno de otra criatura, puede usar una Reacción para realizar uno de los ataques indicados en su sección de **Ataques**, siempre que ese ataque no posea Recarga.

- Si normalmente puede realizar varios ataques como parte de su Acción, realiza solamente **uno**.
- Si normalmente realiza un único ataque con su Acción, el ataque realizado mediante esta Reacción inflige **la mitad del daño, redondeando hacia abajo**.

Todas las demás propiedades del ataque se resuelven normalmente.

**Guardia Reactiva:** Cuando una criatura realiza una Tirada de Ataque contra el jefe, después de conocer el resultado pero antes de resolver el impacto y el daño, el jefe puede usar una Reacción para obtener **+2 a su Esquiva contra ese ataque**.

Estas opciones no reemplazan las Reacciones propias de la criatura. Las Reacciones representan un recurso compartido: utilizar una para atacar, defenderse o reposicionarse significa renunciar a utilizarla para otra opción durante esa ronda.

Las Reacciones adicionales no permiten utilizar Acciones, Interacciones o capacidades especiales como Reacción salvo que una regla del bloque de estadísticas indique expresamente lo contrario.

### Evaluar las Reacciones de un Jefe

Las Mejoras de Jefe no benefician por igual a todos los bloques de estadísticas. Antes de utilizarlas, revisa qué puede hacer realmente la criatura con sus Reacciones.

Como referencia, _Ataque Rápido_ busca representar aproximadamente una fracción de la Acción ofensiva normal de una criatura. En un Asalto Múltiple compuesto por ataques similares, realizar uno de esos ataques suele cumplir naturalmente esta función.

Si una criatura posee un Asalto Múltiple compuesto por ataques de potencias muy diferentes y uno de ellos representa por sí solo una proporción excepcionalmente grande de su ofensiva normal, considera limitar qué ataque puede utilizar mediante _Ataque Rápido_ o tener en cuenta esta eficiencia al evaluar el encuentro.

Los mejores jefes presentan decisiones reales sobre cómo gastar sus Reacciones: ofensiva, defensa, movimiento, control o capacidades propias de su bloque. Una criatura que siempre obtiene más valor utilizando la misma Reacción probablemente necesite más variedad táctica en su diseño.

## Guía Estratégica para el DJ: Balance y Composición

El presupuesto de PA es tu herramienta principal, pero **tu criterio es la clave final**. Usa estos principios para interpretar el presupuesto y construir encuentros memorables y balanceados:

1.  **Conoce a tu Grupo (Regla de Oro):** Adapta la composición (número vs. Rango de enemigos) a _tu_ mesa específica. ¿Son tácticos? ¿Tienen AoE (efecto en área)? ¿Les falta curación? El "Rango Máx. Sugerido" de la Tabla Maestra es un buen punto de partida para encuentros _estándar_, pero si tu grupo tiene debilidades claras (ej. nula respuesta a voladores), sé cauto al explotarlas, incluso si el presupuesto lo permite. Un encuentro Fácil para un grupo optimizado puede ser Normal o Difícil para otro. **Tu objetivo es desafiar, no frustrar.**
2.  **Calidad sobre Cantidad (Cantidad Adecuada de Enemigos):**
    - **Objetivo:** Intenta que la mayoría de tus encuentros (Normal, Difícil) tengan una cantidad de enemigos que esté entre el número de personajes y el doble de ese valor (por ejemplo, entre 4 y 8 criaturas para un grupo de 4 personajes). Esto suele generar el mejor equilibrio entre desafío táctico y fluidez del combate, evitando turnos excesivamente largos.
    - **Gestión del Presupuesto:** Si tu presupuesto te permite comprar muchos monstruos de bajo rango (>10-12), **considera activamente gastar _menos_ del presupuesto total** o (preferiblemente) **sustituir** grupos de enemigos de bajo Rango por **uno o dos de Rango superior** (respetando las guías sobre Rangos Superiores). El coste exponencial de R4+ te ayudará naturalmente a mantener bajo el número total de enemigos en niveles altos.
    - **Hordas Intencionales:** Si buscas una sensación de asedio, puedes usar hordas (>10 R1), pero sé consciente de que alargará el combate y la economía de acciones puede ser brutal. Resérvalo para momentos clave y considera usar monstruos R1 con _muy_ baja salud (menos PPF invertidos en PS) para acelerar su resolución.
3.  **Economía de Acciones y Supervivencia de Jefes:**
    - El bando con más acciones suele tener ventaja. Un jefe solitario puede utilizar **Mejoras de Jefe** para mantenerse activo entre los turnos de los personajes.
    - No intentes compensar siempre la inferioridad numérica aumentando únicamente la Salud. Más Salud prolonga el combate, pero no necesariamente lo vuelve más interesante.
    - Los jefes efectivos suelen combinar varias capas: Salud suficiente para ejecutar su estrategia, alguna defensa significativa, movilidad, respuestas frente a control y opciones de Reacción que compitan entre sí.
    - En Rangos altos, presta especial atención a efectos capaces de eliminar turnos, impedir Reacciones o neutralizar completamente una criatura. Las Determinaciones de Jefe ofrecen una protección limitada contra una tirada decisiva, pero el grupo puede intentar forzar varias salvaciones durante la misma ronda para superar esa defensa.
4.  **El Peligro (y Oportunidad) de Rangos Superiores:**
    - **Coste Elevado:** Incluir monstruos de Rangos superiores consume rápidamente una porción significativa del presupuesto: R3 cuesta 6 PA, R4 cuesta 10 PA, R5 cuesta 20 PA y R6 cuesta 40 PA. Este crecimiento limita naturalmente su número y posiciona a las criaturas de mayor Rango como amenazas centrales del encuentro.
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
9.  **La Salud Narrativa (Flexibilidad y Ritmo):**
    Aunque los Puntos de Salud (PS) son una métrica vital, recuerda que son una abstracción para medir el aguante, no un contrato inquebrantable. Como DJ, tienes el poder de ajustar la salud de un enemigo sobre la marcha para priorizar el ritmo narrativo, siempre y cuando respetes las decisiones y la agencia de los jugadores.
    - **El Golpe de Gracia Cinematográfico:** Si un monstruo está gravemente herido (le queda un 10% o 20% de su Salud) y un jugador realiza una acción épica, gasta Puntos de Suerte en un ataque crucial o logra un Éxito Excepcional, no dejes que el monstruo sobreviva con 2 PS solo por rigurosidad matemática. Permite que ese momento increíble sea el golpe de gracia.
    - **El Segundo Aliento del Jefe (Con Justificación):** Si el gran villano de la campaña está siendo derrotado de forma anticlimática en la primera ronda, puedes extender su salud para mantener la tensión. Sin embargo, nunca lo hagas de forma invisible. Justifícalo narrativamente: describe cómo el jefe consume una poción oculta, cómo la energía oscura de la sala lo revitaliza repentinamente, o cómo entra en una segunda fase de combate por pura adrenalina.
    - **El Caos como Herramienta:** Si decides extender la vida de un jefe clave de forma drástica, considera gastar tus Puntos de Caos para activar una Segunda Oportunidad narrativa o un Reflejo Hostil defensivo. De este modo, la alteración mecánica está anclada a los recursos del juego.
    - **Respeta el Triunfo Legítimo:** Si los jugadores derrotan rápidamente a un enemigo formidable a través de una planificación brillante, trabajo en equipo impecable y tiradas excepcionales, **déjalos ganar**. No hay nada más satisfactorio para un jugador que ver su estrategia ejecutada a la perfección; alargar el combate artificialmente en estos casos castiga su buen desempeño.

> **Ejemplo Final:** Grupo de **4 Jugadores**, **PP Promedio 100** (R3 Avanzado), Dificultad **Difícil**.
>
> - Presupuesto Total: **42 PA**. Rango Máx. Sugerido: R3 (_Considerar 1x R4_).
> - **Opción 1 (Élites R3):** 7x Monstruos R3 (42 PA). _Análisis: Un encuentro homogéneo de enemigos poderosos. Tiene una cantidad de criaturas razonable, aunque puede volverse tácticamente repetitivo si todas cumplen funciones similares._
> - **Opción 2 (Jefe R4 + Élites - Recomendada):** 1x Monstruo R4 (10 PA) + 4x Monstruos R3 (24 PA) + 4x Monstruos R2 (8 PA) = **42 PA**. _Análisis: 9 enemigos con una jerarquía clara y una combinación equilibrada entre amenaza central, élites y apoyo._
> - **Opción 3 (Calidad sobre Cantidad):** 2x Monstruos R4 (20 PA) + 3x Monstruos R3 (18 PA) + 2x Monstruos R2 (4 PA) = **42 PA**. _Análisis: 7 enemigos de mayor calidad individual. La economía de acciones es más contenida, pero cada enemigo representa una amenaza considerable._

## Crear Criaturas Propias

Si deseas crear tus propios monstruos, el capítulo **Diseño Avanzado de Criaturas** te guía usando un sistema de **Puntos de Perfil (PPF)**. Cada Rango de Monstruo (1 a 6) tiene un presupuesto de PPF y tablas calibradas para "comprar" sus estadísticas y Rasgos Tácticos, asegurando que se alineen con el balance general del sistema.