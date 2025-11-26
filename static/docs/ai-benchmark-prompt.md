# Protocolo de Benchmark: Proyecto ARCANA RPG (v1.1)

## 1. Objetivo de la Simulación

Ejecutar un análisis matemático y táctico del sistema ARCANA para validar dos hipótesis fundamentales:

1.  **Balance de Arquetipos:** Verificar que las clases cumplen su función (nicho) y que la disparidad numérica entre builds "Optimizadas" y "Balanceadas" no rompe el juego.
2.  **Calibración del Bestiario:** Determinar si las _Tablas de Constructor de Monstruos_ siguen siendo válidas frente al nuevo nivel de poder de los personajes.

---

## 2. Parámetros de Simulación (Instrucciones de Cálculo)

Para asegurar la precisión de los datos, rígete estrictamente por los siguientes parámetros:

- **Valores de Dados:** Utiliza siempre el promedio matemático (d4=2.5, d6=3.5, d8=4.5, d10=5.5, d12=6.5).
- **Economía de Acciones Completa:** Al calcular el daño o la utilidad por turno, asume que el personaje utiliza **toda** su economía disponible (Acción + Interacción + Reacción) si su build lo permite. No calcules solo la Acción principal; si un Monje puede pegar extra con Interacción, súmalo.
- **Gestión de Recursos y Recarga:**
  - **Para DPR Sostenido:** Simula un combate promedio de **3 a 4 rondas**. Asume que las habilidades con Recarga 4+ están disponibles el 60% de los turnos. Asume que las habilidades de Recarga 6+ o 8+ solo se usan una vez.
  - **Para DPR Nova:** Asume que todos los recursos (Recargas, Usos Diarios, Puntos de Suerte) están disponibles y se gastan en el primer turno para maximizar el impacto.
- **Impacto de Atributos:** Recuerda que en ARCANA los atributos **NO** se suman al daño del arma base, a menos que una carta específica diga lo contrario.

---

## 3. Los Sujetos de Prueba: Perfiles de Arquetipo

Analiza cada clase en tres hitos de progresión: **Rango 1 (Inicio)**, **Rango 3 (Salto de Poder)** y **Rango 5 (Endgame)**.

### Definición de Nichos

- **Combatiente:** Daño Sostenido (DPR), Supervivencia (Tanqueo).
- **Pícaro:** Daño Explosivo Condicional (Burst), Utilidad no mágica.
- **Arcanista:** Daño de Área (AoE), Control, Utilidad Mágica.
- **Sacerdote:** Soporte Defensivo, Tanqueo secundario, Anti-Sobrenatural.
- **Monje:** Movilidad, Control Duro (Aturdir), Anti-Armadura.
- **Druida:** Control de Terreno, Tanqueo Temporal (HP Extra), Versatilidad.
- **Bardo:** Multiplicador de Fuerza (Buff/Debuff), Economía de Acción.

### Definición de Builds (Configuraciones)

Para cada clase y rango, simula dos variantes:

#### A. La Build Balanceada (El Jugador Promedio)

- **Filosofía:** Busca ser útil dentro y fuera de combate.
- **Atributos:** Reparte puntos. El atributo principal es bueno (3 o 4), pero invierte en secundarios (Mente para saber, Presencia para hablar).
- **Cartas:** Mezcla de Combate (50%) y Utilidad/Sabor (50%).

#### B. La Build Optimizada (El Power Gamer)

- **Filosofía:** Maximizar la eficiencia matemática en combate.
- **Atributos:** "Min-Max". Atributo principal al máximo posible (llegando a 6 en Rango 5).
- **Cartas:** 100% enfocadas en sinergia de combate (Acción + Interacción), daño y mitigación.
- **Equipo:** El mejor posible para el nivel.

---

## 4. Los Adversarios: Estándares de Amenaza

Utiliza las estadísticas promedio de la **Tabla de Constructor de Monstruos** para generar un "Enemigo de Control" (Dummy) para cada Rango.

- **Dummy R1:** Salud Media, Esquiva 7, Daño 3.
- **Dummy R3:** Salud Media, Esquiva 9, Mitigación 1, Daño 10.
- **Dummy R5:** Salud Media (Tanque), Esquiva 11, Mitigación 3, Daño 25.

---

## 5. Métricas de Evaluación

Para cada cruce (Arquetipo vs Dummy), calcula:

1.  **DPR Sostenido (Damage Per Round):** Daño promedio turno tras turno sin quemar recursos de recarga alta (o promediando su uso en 4 rondas).
2.  **DPR Nova (Burst):** Daño máximo posible en un solo turno ("Alpha Strike").
3.  **TTK (Time To Kill):** Cuántos turnos tarda el PJ en matar a un enemigo de su mismo Rango (1vs1).
    - _Fórmula:_ `Salud Enemigo / DPR del PJ`.
4.  **TTL (Time To Live):** Cuántos turnos aguanta el PJ vivo contra un enemigo de su mismo Rango.
    - _Fórmula:_ `Salud PJ / (Daño Enemigo * %Acierto Enemigo)`.

---

## 6. Escenarios de Validación (El "Test de Estrés")

Evalúa los siguientes escenarios y emite un veredicto:

### Escenario A: Balance Interno de Arquetipos

- ¿Existe alguna clase cuyo **DPR Sostenido** en Build Optimizada sea más del **50% superior** a la siguiente mejor clase? (Bandera Roja: Clase Rota).
- ¿Existe alguna clase cuya **Build Balanceada** no pueda matar a un enemigo de su rango en menos de 5 turnos? (Bandera Roja: Clase Inútil).
- ¿El Pícaro Optimizado supera al Combatiente Optimizado en daño contra objetivos con alta Mitigación? (Verificación de Nicho).

### Escenario B: Validación de Encuentros (Party vs Monstruos)

Simula un grupo de **4 PJs** (Combatiente, Sacerdote, Pícaro, Arcanista) enfrentando un **Encuentro Estándar** según las reglas de presupuesto de XP/PA.

1.  **Grupo Balanceado vs Encuentro Normal:**
    - _Expectativa:_ Victoria segura. Gasto de recursos: 20-30%. Ningún PJ cae inconsciente.
2.  **Grupo Balanceado vs Encuentro Difícil:**
    - _Expectativa:_ Victoria probable. Gasto de recursos: 60-80%. Riesgo de 1 PJ inconsciente.
3.  **Grupo Optimizado vs Encuentro Difícil:**
    - _Expectativa:_ Victoria dominante. Gasto de recursos: <40%. Sensación de facilidad.
4.  **Grupo Optimizado vs Encuentro Épico:**
    - _Expectativa:_ Lucha tensa. Gasto de recursos: 90-100%. Riesgo real de muerte.

---

## 7. Salida Esperada (Deliverables)

El informe final debe contener:

1.  **Tabla de DPS por Clase/Rango:** Comparativa visual de las 7 clases.
2.  **Informe de "Salud del Bestiario":**
    - ¿Son los monstruos Rango 3 demasiado frágiles para el daño actual de los PJs?
    - ¿Es la Mitigación de los monstruos Rango 5 suficiente para frenar al Combatiente pero no al Monje/Pícaro?
3.  **Detección de Anomalías:** Lista de cartas o interacciones específicas que generen valores fuera de la curva (Outliers).
4.  **Veredicto Final:** ¿Se aprueba el sistema o requiere parches en las tablas de monstruos?

---

**Instrucción para el Modelo:** _No ejecutes los cálculos ahora. Confirma que entiendes la estructura del benchmark y que tienes todos los datos necesarios (reglas actualizadas, lista definitiva de cartas, tablas de monstruos) para proceder cuando se te ordene._
