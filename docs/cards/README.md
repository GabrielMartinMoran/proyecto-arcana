# Cartas de habilidad — fuente modular

La fuente de datos de las cartas de habilidad de Arcana vive en este
directorio, dividida en un archivo YAML por cada primera etiqueta
(`tags[0]`) de las cartas. El archivo `index.json` es el manifiesto que
define el orden canónico de carga.

Cada archivo YAML replica el contrato de la fuente monolítica: la raíz
`cards` contiene un arreglo no vacío de cartas. La primera etiqueta de
cada carta determina tanto el archivo al que pertenece como la imagen de
la carta, y por eso nunca cambia al mover una carta entre archivos.

## Estructura del directorio

- `index.json` — manifiesto ordenado con el nombre de cada archivo YAML.
- `<primera-etiqueta>.yml` — un archivo por cada primera etiqueta, con
  las cartas del grupo en su orden original.

Los archivos siguen el orden de primera aparición de cada primera
etiqueta en la fuente original, por ejemplo: `linaje.yml`, `dote.yml`,
`picaro.yml`, `combatiente.yml`, `coloso.yml`, `cefiro.yml`,
`arcanista.yml`, `mago.yml`, `brujo.yml`, `hechicero.yml`,
`sacerdote.yml`, `druida.yml`, `bardo.yml`, `monje.yml` y `sinergia.yml`.

## Declaración de cartas

Todas las cartas se declaran bajo la clave `cards`, dentro de un arreglo.
Una carta declara estos campos:

| Campo          | Requerido | Descripción                                                                                  |
| -------------- | --------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------- |
| `name`         | Sí        | Nombre único de la carta.                                                                    |
| `level`        | Sí        | Nivel de la carta (entero).                                                                  |
| `type`         | Sí        | `efecto` (pasiva) o `activable` (activa).                                                    |
| `tags`         | Sí        | Lista de etiquetas para categorizar. La primera etiqueta agrupa la carta y define su imagen. |
| `requirements` | No        | Lógica booleana con `&` (AND), `                                                             | `(OR) y`()`; puede omitirse o ser `null`. Ejemplo: `"(Cuerpo 2 & Mente 1) | (Instinto 3)"`. |
| `description`  | Sí        | Descripción detallada. Usa `>-` para bloques de texto.                                       |
| `uses`         | No        | Definición opcional de usos y cargas con `type`, `qty` y `formula`.                          |

### Formato por campo

- `name` debe ser único en todo el sistema. Si contiene caracteres
  especiales (por ejemplo, dos puntos), escríbelo entre comillas
  simples.
- `level` es un número entero, generalmente entre 1 y 5.
- `type` solo admite los valores `efecto` y `activable`.
- `tags` es una lista de etiquetas, empezando por la etiqueta de grupo
  (por ejemplo, `Linaje`, `Dote`, `Pícaro`, `Arcanista`, `Sinergia`).
  Como indica el nombre del archivo, la primera etiqueta agrupa la
  carta; el grupo y la imagen de la carta no cambian aunque la carta se
  mueva entre archivos.
- `requirements` es opcional: puede omitirse o ser `null`. Solo aparece
  con valor `null` en tres cartas del sistema.
- `description` es un bloque de texto que usa `>-`. Las reglas de
  formato son:
  - Usa `<br>` para saltos de línea.
  - Usa `**Negrita**` solo para nombres al inicio de viñetas.
  - Usa `_Cursiva_` para referencias a nombres de otras cartas o
    etiquetas.
- `uses` es opcional: una carta sin este campo o con `null` no tiene usos
  limitados. Define los usos de la carta:
  - `type` — `null` (cartas `efecto` o usos ilimitados), `RELOAD` (se
    recarga al inicio del encuentro; `qty` es el valor mínimo que hay que
    sacar para la recarga), `USES`, `LONG_REST` (se recarga tras un día de
    descanso) o `DAY`.
  - `qty` — cantidad de usos. Es opcional y su valor por defecto es `0`.
  - `formula` — fórmula opcional que calcula los usos totales. Si existe,
    tiene prioridad sobre `qty`.

### Fórmulas de usos

`uses.formula` calcula los usos totales de la carta a partir de los
atributos del personaje, con el mismo evaluador que usa la hoja de
personaje. La fórmula puede usar los atributos `cuerpo`, `reflejos`,
`mente`, `instinto`, `presencia` y `ppGastados`, además de `floor`, `ceil`,
`round`, `max`, `min` y el objeto `Math`.

Si la fórmula existe, tiene prioridad sobre `qty`. Si no compila o no
evalúa a un número finito, la carta da 0 usos en tiempo de ejecución. La
suite de tests recorre el corpus y evalúa todas las fórmulas declaradas
con un contexto de atributos de muestra.

Ejemplos:

```yaml
uses:
  type: LONG_REST
  formula: presencia
```

```yaml
uses:
  type: LONG_REST
  formula: max(1, floor(reflejos/2))
```

La primera fórmula es la de _Reprensión Infernal_ y la segunda, la de
_Movilidad Elemental_.

### Ejemplo

```yaml
cards:
  - name: Talento de Familia
    level: 1
    type: efecto
    tags:
      - Linaje
      - Humano
    requirements: Solo Creación de Personaje
    description: >-
      _Texto de sabor narrativo._<br><br>
      Texto de la descripción mecánica.
    uses:
      type: null
      qty: 0
```

## Manifiesto y orden canónico

`index.json` declara la lista de archivos en el orden canónico, que es
el orden de primera aparición de cada primera etiqueta en la fuente
original. Dentro de cada archivo, las cartas conservan su orden
original relativo.

La fuente monolítica anterior (`static/docs/cards.yml`) fue eliminada una vez
consumida y validada por la aplicación web y el generador de la skill bajo el
nombre lógico `cards.yml`.
