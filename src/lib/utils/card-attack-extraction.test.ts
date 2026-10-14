/**
 * Unit tests for the spell attack extractor.
 *
 * The description fixtures are verbatim copies of the YAML-folded scalars that
 * the card mapper serves from `static/docs/cards/*.yml`; the "fixture
 * provenance" suite re-parses those sources and fails when a copied string
 * drifts from the canonical card.
 */

import { load as parseYaml } from 'js-yaml';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { extractCardAttack, type ExtractedCardAttack } from './card-attack-extraction';

interface CardFixture {
	name: string;
	file: string;
	description: string;
}

const cardFixture = (name: string, file: string, description: string): CardFixture => ({
	name,
	file,
	description,
});

const DESCARGA_SOBRENATURAL = cardFixture(
	'Descarga Sobrenatural',
	'brujo.yml',
	'_Canalizas el poder puro de tu patrón en un proyectil ineludible y letal._<br><br> Al añadir esta carta a tu colección, elige un tipo de daño permanente que depende de tu patrón: Eléctrico, Frío, Fuego, Fuerza, Necrótico, Psíquico o Radiante.<br> Realizas un ataque de conjuro (1d8e + Presencia) a distancia Media. Si impactas, infliges 1d8 de daño del tipo elegido.<br><br> _Esta carta solo puede ser adquirida a través de Pacto Supremo._',
);
const ENTIDAD_DESATADA = cardFixture(
	'Entidad Desatada',
	'brujo.yml',
	'_La esencia de tu familiar se condensa, volviéndolo más resistente y nutriendo sus capacidades ofensivas._<br><br> La Salud máxima de tu familiar pasa a ser igual a tres veces tu puntuación de Presencia, y el daño de su Detonación aumenta a 3d8.<br> - **Azote en Movimiento:** Al usar la acción de Desplazamiento de tu familar, si al finalizar este se encuentra a distancia Inmediata de una criatura a la que hayas atacado en este turno, el familiar desata un latigazo de energía inestable. Realizas un ataque de conjuro cuerpo a cuerpo usando tu Presencia. Si impactas, infliges 1d8 de daño del mismo tipo que tu _Descarga Sobrenatural_.',
);
const DESCARGA_ELEMENTAL = cardFixture(
	'Descarga Elemental',
	'arcanista.yml',
	'_Canalizas la energía pura de los elementos en un proyectil inestable que lanzas contra tus oponentes._<br><br> Eliges un tipo de daño: Fuego, Frío o Eléctrico. Realizas un ataque de conjuro (1d8e + Atributo Arcano) a distancia Cercana contra un objetivo. Si impactas, infliges 1d8 de daño del tipo elegido.',
);
const RAYO_ENTROPICO = cardFixture(
	'Rayo Entrópico',
	'arcanista.yml',
	'_Proyectas un haz de energía oscura y corrosiva que marchita la vitalidad de tu objetivo.._<br><br> Realizas un ataque de conjuro (1d8e + Atributo Arcano) a distancia Cercana contra un objetivo.<br> Si impactas, infliges 1d6 de daño Necrótico y el objetivo no puede recuperar Puntos de Salud hasta el final de tu próximo turno.',
);
const ANDANADA_ENERGETICA = cardFixture(
	'Andanada Energética',
	'arcanista.yml',
	'_Divides la energía elemental en una rápida salva de proyectiles que convergen sobre uno o varios enemigos._<br><br> Elige Fuego, Frío o Eléctrico. Realizas tres ataques de conjuro independientes (1d8e + Atributo Arcano) contra criaturas que puedas ver a distancia Cercana. Puedes elegir el mismo objetivo o uno diferente para cada ataque.<br> Cada ataque que impacte inflige 1d6 de daño del tipo elegido.',
);
const RAFAGA_ANIQUILADORA = cardFixture(
	'Ráfaga Aniquiladora',
	'arcanista.yml',
	'_Lanzas proyectiles de fuerza pura en una secuencia frenética, manteniendo el ataque mientras tu voluntad aguante._<br><br> Realizas un ataque de conjuro a distancia (1d8e + Atributo Arcano) contra un objetivo. Si impactas, el objetivo recibe 2d8 de daño de Fuerza y puedes repetir el ataque, pero la siguiente tirada de ataque sufre un -1 acumulativo. Puedes continuar atacando de esta manera, acumulando un -1 por cada golpe adicional, hasta que falles una tirada de ataque o decidas detener la ráfaga.',
);
const ENJAMBRE_PARASITARIO = cardFixture(
	'Enjambre Parasitario',
	'arcanista.yml',
	'_De las mangas de tu túnica brota una nube de insectos cadavéricos y escarabajos necrófagos que envuelven a tu enemigo._<br><br> Realizas un ataque de conjuro (1d8e + Atributo Arcano) contra una criatura a distancia Cercana.<br> Si impactas, el enjambre se adhiere a ella durante 1 minuto.<br> La criatura sufre 1d6 de daño Perforante al inicio de cada uno de sus turnos.<br> Además, mientras el enjambre la cubra, la criatura sufre Desventaja (-1d4) en cualquier prueba de habilidad para mantener la Concentración.<br> El objetivo u otra criatura a distancia inmediata de este puede usar su Acción para aplastar y disipar el enjambre, terminando el efecto.',
);
const SEGADOR_INCORPOREO = cardFixture(
	'Segador Incorpóreo',
	'arcanista.yml',
	'_Desgarras el velo para conjurar a un verdugo espectral envuelto en mortajas, armado con una guadaña de sombra._<br><br> Invocas una entidad incorpórea que ocupa un espacio Mediano a distancia Cercana durante 1 minuto.<br> El segador es invulnerable, pero no bloquea el paso.<br> Cuando lanzas el conjuro, y en cada uno de tus turnos subsiguientes usando tu Interacción, puedes ordenar al Segador que se mueva hasta 10 metros en cualquier dirección y realice un ataque de conjuro cuerpo a cuerpo (1d8e + Atributo Arcano) contra un enemigo a distancia Inmediata a él. Si impacta, inflige 2d8 de daño Necrótico y el objetivo no puede recuperar Puntos de Salud hasta el inicio de tu próximo turno.',
);
const RAYO_DESINTEGRADOR = cardFixture(
	'Rayo Desintegrador',
	'arcanista.yml',
	'_Un haz de energía verde esmeralda brota de tu dedo para reducir la materia de tu objetivo a cenizas._<br><br> Elije un objetivo a distancia Media. Este debe superar una TS de Reflejos (ND 5 + Atributo Arcano). Si falla, recibe 10d8 de daño de Fuerza. Si tiene éxito, la mitad.<br> Si el daño reduce al objetivo a 0 Puntos de Salud, se convierte en un fino polvo gris y es destruido.',
);
const RAFAGA_INESTABLE = cardFixture(
	'Ráfaga Inestable',
	'hechicero.yml',
	'_Liberas una descarga de la energía sobrenatural que, al impactar, puede desbordarse en una cascada de destrucción impredecible._<br><br> Realizas un ataque de conjuro (1d8e + Atributo Arcano) a distancia Cercana contra un objetivo. Si impactas, infliges 1d6 de _Daño de Herencia_.<br> - **Cascada Menor:** Si el dado de daño resulta en un 6 natural, la energía se desborda: tiras 1d6 adicional y lo sumas al daño total. Este dado también puede generar otro dado adicional si obtiene un 6.',
);
const ANOMALIA_SALVAJE = cardFixture(
	'Anomalía Salvaje',
	'hechicero.yml',
	'_Al forzar tu poder, la magia errática desestabiliza la realidad a tu alrededor, creando efectos aleatorios._<br><br> Inmediatamente después de sacrificar Puntos de Salud usando tu carta _Sangre Mágica_, tira 1d4 para determinar qué efecto secundario se manifiesta:<br> - **Parpadeo:** Te teletransportas hasta 3 metros a un espacio desocupado que puedas ver.<br> - **Distorsión:** El próximo ataque que recibas antes del inicio de tu próximo turno se realiza con Desventaja (-1d4).<br> - **Claridad:** Tu próxima tirada de ataque de conjuro antes del final de tu próximo turno obtiene Ventaja (+1d4).<br> - **Ruptura Defensiva:** Eliges a una criatura a distancia Media que puedas ver. Esta sufre Desventaja (-1d4) en la próxima Tirada de Salvación que realice contra uno de tus conjuros antes del final de tu próximo turno.',
);
const GOLPE_PRIMORDIAL = cardFixture(
	'Golpe Primordial',
	'druida.yml',
	'_Tus golpes se imbuyen con la esencia de la tierra, el viento o el agua, golpeando con la fuerza de los elementos._<br><br> Realizas un ataque de conjuro cuerpo a cuerpo (1d8e + Instinto). Si impactas, infliges 1d6 de daño y eliges uno de los siguientes efectos elementales que te afecta a ti:<br> - **Tierra (Contundente):** Te recubres de piedra. Ganas +1 de Mitigación Física contra el próximo ataque que recibas antes del inicio de tu próximo turno.<br> - **Viento (Cortante):** El aire te desvía. Ganas +1 a tu Esquiva contra el próximo ataque que recibas antes del inicio de tu próximo turno.<br> - **Agua (Frío):** Una capa de escarcha te protege. Ganas +1 de Mitigación Mágica contra el próximo ataque que recibas antes del inicio de tu próximo turno.<br>',
);
const LATIGO_DE_ESPINAS = cardFixture(
	'Látigo de Espinas',
	'druida.yml',
	'_Una liana espinosa brota de tu mano como una extensión de tu voluntad, lista para azotar y arrastrar a tus presas._<br><br> Realizas un ataque de conjuro (1d8e + Instinto) contra un objetivo a distancia Cercana.<br> Si impactas, infliges 1d6 de daño Cortante y puedes forzar al objetivo a realizar una Tirada de Salvación de Cuerpo (ND 5 + Instinto). Si falla la Tirada de Salvación, mueves al objetivo 1 metro en cualquier dirección.',
);
const LLAMA_SAGRADA = cardFixture(
	'Llama Sagrada',
	'sacerdote.yml',
	'_Invocas la luz purificadora de tu deidad en forma de un proyectil de energía radiante, marcando e iluminando a tu enemigo para el próximo ataque._<br><br> Lanzas un virote de energía radiante a una criatura que puedas ver a distancia Cercana. Realiza una tirada de ataque de conjuro (1d8e + Instinto). Si impactas, infliges 1d6 de daño Radiante y el objetivo comienza a brillar hasta el final de tu próximo turno o hasta que vuelva a recibir daño.<br> Mientras brille, el siguiente ataque contra el objetivo obtiene Ventaja (+1d4) en el ataque.',
);
const ARMA_ESPIRITUAL = cardFixture(
	'Arma Espiritual',
	'sacerdote.yml',
	'_Das forma a tu fe en la figura de un arma incorpórea que asesta golpes dictados por tu inquebrantable voluntad._<br><br> Invocas un arma de energía pura que flota en el aire a distancia Cercana durante 1 minuto.<br> Cuando lanzas el conjuro, y en cada uno de tus turnos subsiguientes usando tu Interacción, puedes mover el arma hasta 10 metros y realizar un ataque de conjuro (1d8e + Instinto) contra una criatura Inmediata a ella. Si impactas, infliges 2d8 de daño de Fuerza.<br> - **Canalizar Castigo:** Cando impactas un ataque con el _Arma Espiritual_, si tienes _Golpe Divino_ activa y disponible para usar, puedes usarla como parte de la misma Interacción.',
);

const FIXTURES: CardFixture[] = [
	DESCARGA_SOBRENATURAL,
	ENTIDAD_DESATADA,
	DESCARGA_ELEMENTAL,
	RAYO_ENTROPICO,
	ANDANADA_ENERGETICA,
	RAFAGA_ANIQUILADORA,
	ENJAMBRE_PARASITARIO,
	SEGADOR_INCORPOREO,
	RAYO_DESINTEGRADOR,
	RAFAGA_INESTABLE,
	ANOMALIA_SALVAJE,
	GOLPE_PRIMORDIAL,
	LATIGO_DE_ESPINAS,
	LLAMA_SAGRADA,
	ARMA_ESPIRITUAL,
];

const resolved = (atkFormula: string, dmgFormula: string, notes: string): ExtractedCardAttack => ({
	atkFormula,
	dmgFormula,
	notes,
	unresolvedAttributes: [],
});

const unresolved = (
	dmgFormula: string,
	notes: string,
	...attributes: string[]
): ExtractedCardAttack => ({
	atkFormula: null,
	dmgFormula,
	notes,
	unresolvedAttributes: attributes,
});

interface FixedAttributeCase {
	name: string;
	card: CardFixture;
	expected: ExtractedCardAttack;
}

const FIXED_ATTRIBUTE_CASES: FixedAttributeCase[] = [
	{
		name: 'Descarga Sobrenatural',
		card: DESCARGA_SOBRENATURAL,
		expected: resolved('1d8e+presencia', '1d8', 'Conjuro · tipo elegido'),
	},
	{
		name: 'Golpe Primordial',
		card: GOLPE_PRIMORDIAL,
		expected: resolved('1d8e+instinto', '1d6', 'Conjuro · cuerpo a cuerpo'),
	},
	{
		name: 'Látigo de Espinas',
		card: LATIGO_DE_ESPINAS,
		expected: resolved('1d8e+instinto', '1d6', 'Conjuro · Daño: Cortante'),
	},
	{
		name: 'Llama Sagrada',
		card: LLAMA_SAGRADA,
		expected: resolved('1d8e+instinto', '1d6', 'Conjuro · Daño: Radiante'),
	},
	{
		name: 'Arma Espiritual',
		card: ARMA_ESPIRITUAL,
		expected: resolved('1d8e+instinto', '2d8', 'Conjuro · Daño: Fuerza · invocación'),
	},
];

interface ArcaneAttributeCase {
	name: string;
	card: CardFixture;
	dmgFormula: string;
	notes: string;
}

/**
 * The acceptance table for these entries expected atk `1d8e+{arcano}`. The
 * Segador Incorpóreo attack phrase is "ataque de conjuro cuerpo a cuerpo", so
 * the fixed notes order also yields the "cuerpo a cuerpo" token (real text
 * beats the orientative plan table).
 */
const ARCANE_ATTRIBUTE_CASES: ArcaneAttributeCase[] = [
	{
		name: 'Descarga Elemental',
		card: DESCARGA_ELEMENTAL,
		dmgFormula: '1d8',
		notes: 'Conjuro · tipo elegido',
	},
	{
		name: 'Rayo Entrópico',
		card: RAYO_ENTROPICO,
		dmgFormula: '1d6',
		notes: 'Conjuro · Daño: Necrótico',
	},
	{
		name: 'Andanada Energética',
		card: ANDANADA_ENERGETICA,
		dmgFormula: '1d6',
		notes: 'Conjuro · tipo elegido · 3 ataques',
	},
	{
		name: 'Ráfaga Aniquiladora',
		card: RAFAGA_ANIQUILADORA,
		dmgFormula: '2d8',
		notes: 'Conjuro · Daño: Fuerza',
	},
	{
		name: 'Ráfaga Inestable',
		card: RAFAGA_INESTABLE,
		dmgFormula: '1d6',
		notes: 'Conjuro · Daño de Herencia',
	},
	{
		name: 'Segador Incorpóreo',
		card: SEGADOR_INCORPOREO,
		dmgFormula: '2d8',
		notes: 'Conjuro · Daño: Necrótico · invocación · cuerpo a cuerpo',
	},
];

interface NegativeCase {
	name: string;
	card: CardFixture;
}

const NEGATIVE_CASES: NegativeCase[] = [
	{
		name: 'Enjambre Parasitario (impact without an impact damage phrase)',
		card: ENJAMBRE_PARASITARIO,
	},
	{
		name: 'Entidad Desatada / Azote en Movimiento (attack phrase without parenthesized formula)',
		card: ENTIDAD_DESATADA,
	},
	{
		name: 'Rayo Desintegrador (saving throw damage, no attack roll)',
		card: RAYO_DESINTEGRADOR,
	},
	{
		name: 'Anomalía Salvaje / Claridad (attack phrase followed by a non-formula parenthesis)',
		card: ANOMALIA_SALVAJE,
	},
];

describe('extractCardAttack — cards with a fixed attack attribute', () => {
	it.each(FIXED_ATTRIBUTE_CASES)('extracts the real "$name" attack', ({ card, expected }) => {
		expect(extractCardAttack(card.description, { arcaneAttribute: 'mente' })).toEqual(expected);
	});
});

describe('extractCardAttack — Atributo Arcano alias resolution', () => {
	it.each(ARCANE_ATTRIBUTE_CASES)(
		'resolves "$name" to mente when arcaneAttribute is "mente"',
		({ card, dmgFormula, notes }) => {
			expect(extractCardAttack(card.description, { arcaneAttribute: 'mente' })).toEqual(
				resolved('1d8e+mente', dmgFormula, notes),
			);
		},
	);

	it.each(ARCANE_ATTRIBUTE_CASES)(
		'resolves "$name" to presencia when arcaneAttribute is "presencia"',
		({ card, dmgFormula, notes }) => {
			expect(extractCardAttack(card.description, { arcaneAttribute: 'presencia' })).toEqual(
				resolved('1d8e+presencia', dmgFormula, notes),
			);
		},
	);

	it.each(ARCANE_ATTRIBUTE_CASES)(
		'reports "$name" as unresolved when arcaneAttribute is null',
		({ card, dmgFormula, notes }) => {
			expect(extractCardAttack(card.description, { arcaneAttribute: null })).toEqual(
				unresolved(dmgFormula, notes, 'Atributo Arcano'),
			);
		},
	);
});

describe('extractCardAttack — negative cards', () => {
	it.each(NEGATIVE_CASES)('returns null for $name', ({ card }) => {
		expect(extractCardAttack(card.description, { arcaneAttribute: 'mente' })).toBeNull();
	});
});

describe('extractCardAttack — formula and notes contract', () => {
	it.each([
		['Cuerpo', 'cuerpo'],
		['Reflejos', 'reflejos'],
		['Mente', 'mente'],
		['Instinto', 'instinto'],
		['Presencia', 'presencia'],
	])('translates %s to the lowercase %s variable', (displayName, variableName) => {
		const description = `Realizas un ataque de conjuro (1d8e + ${displayName}). Si impactas, infliges 1d6 de daño.`;

		expect(extractCardAttack(description, { arcaneAttribute: null })).toEqual(
			resolved(`1d8e+${variableName}`, '1d6', 'Conjuro'),
		);
	});

	it('accepts the optional possessive "tu" and free spacing', () => {
		const description =
			'Realizas un ataque de conjuro ( 1d8e   +   tu   Instinto ). Si impactas, infliges 1d6 de daño.';

		expect(extractCardAttack(description, { arcaneAttribute: null })).toEqual(
			resolved('1d8e+instinto', '1d6', 'Conjuro'),
		);
	});

	it('matches the attack and impact phrases case-insensitively', () => {
		const description =
			'REALIZAS UN ATAQUE DE CONJURO (1d8e + MeNtE). SI IMPACTAS, INFLIGES 2D8 DE DAÑO Fuego.';

		expect(extractCardAttack(description, { arcaneAttribute: null })).toEqual(
			resolved('1d8e+mente', '2d8', 'Conjuro · Daño: Fuego'),
		);
	});

	it('reports an unknown attack attribute as unresolved instead of guessing', () => {
		const description =
			'Realizas un ataque de conjuro (1d8e + Carisma). Si impactas, infliges 1d6 de daño.';

		expect(extractCardAttack(description, { arcaneAttribute: 'mente' })).toEqual(
			unresolved('1d6', 'Conjuro', 'Carisma'),
		);
	});

	it('orders the notes as Conjuro, damage type, invocación, cuerpo a cuerpo, 3 ataques', () => {
		const description =
			'Puedes ordenar al familiar que realice tres ataques de conjuro cuerpo a cuerpo (1d8e + Presencia). Cada ataque que impacte inflige 1d6 de daño del tipo elegido.';

		expect(extractCardAttack(description, { arcaneAttribute: null })).toEqual(
			resolved(
				'1d8e+presencia',
				'1d6',
				'Conjuro · tipo elegido · invocación · cuerpo a cuerpo · 3 ataques',
			),
		);
	});

	it('returns null when the description has no attack phrase at all', () => {
		expect(
			extractCardAttack('Una carta sin tirada de ataque.', { arcaneAttribute: null }),
		).toBeNull();
	});
});

describe('spell description fixtures provenance', () => {
	it.each(FIXTURES)('$name is verbatim from $file', async (fixture) => {
		const source = await readFile(
			path.join(process.cwd(), 'static', 'docs', 'cards', fixture.file),
			'utf8',
		);
		const parsed = parseYaml(source) as {
			cards: Array<{ name: string; description: string }>;
		};
		const card = parsed.cards.find((candidate) => candidate.name === fixture.name);

		expect(card?.description).toBe(fixture.description);
	});
});
