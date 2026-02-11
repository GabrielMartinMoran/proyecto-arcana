import type { Skill } from '$lib/types/character';
import { v4 as uuidv4 } from 'uuid';

export const DEFAULT_SKILLS: Omit<Skill, 'id'>[] = [
	// Cuerpo
	{
		name: 'Atletismo',
		attribute: 'body',
		description:
			'Se usa para actividades físicas exigentes como escalar, saltar largas distancias o nadar en aguas turbulentas.',
		hasAdvantage: false,
	},
	{
		name: 'Fuerza Bruta',
		attribute: 'body',
		description:
			'Se usa para aplicar tu poderío físico sin refinamiento para superar un obstáculo. Incluye actos de fuerza explosiva como derribar una puerta, levantar un portón pesado o doblar barrotes.',
		hasAdvantage: false,
	},
	{
		name: 'Aguante',
		attribute: 'body',
		description:
			'Mide tu capacidad para soportar el agotamiento, el dolor y las condiciones adversas a través de pura tenacidad. Se utiliza para realizar marchas forzadas durante días, soportar climas extremos sin el equipo adecuado, aguantar la respiración bajo el agua, resistir los efectos del alcohol o el cansancio para no quedarte dormido, y para sobreponerse al dolor en un interrogatorio físico.',
		hasAdvantage: false,
	},
	// Reflejos
	{
		name: 'Acrobacias',
		attribute: 'reflexes',
		description:
			'Mide tu capacidad para mantener el equilibrio, realizar piruetas, caer de pie y escapar de ataduras.',
		hasAdvantage: false,
	},
	{
		name: 'Juego de Manos',
		attribute: 'reflexes',
		description:
			'Para acciones que requieren destreza manual fina y discreta, como robar bolsillos, plantar un objeto en alguien o realizar trucos de prestidigitación.',
		hasAdvantage: false,
	},
	{
		name: 'Sigilo',
		attribute: 'reflexes',
		description: 'Determina tu éxito al moverte en silencio y evitar ser visto.',
		hasAdvantage: false,
	},
	{
		name: 'Pilotaje',
		attribute: 'reflexes',
		description:
			'Mide tu pericia para controlar monturas y vehículos, especialmente bajo presión. Se utiliza para guiar un carruaje en una persecución a alta velocidad por las calles de una ciudad, para maniobrar una embarcación en aguas turbulentas, o para realizar giros cerrados y maniobras complejas con una montura en el fragor de la batalla.',
		hasAdvantage: false,
	},
	// Mente
	{
		name: 'Conocimiento Arcano',
		attribute: 'mind',
		description:
			'Mide tu conocimiento sobre conjuros, objetos mágicos, tradiciones arcanas, planos de existencia y las criaturas que los habitan.',
		hasAdvantage: false,
	},
	{
		name: 'Historia',
		attribute: 'mind',
		description:
			'Refleja tu conocimiento sobre eventos pasados, reinos legendarios, dinastías antiguas y personajes históricos.',
		hasAdvantage: false,
	},
	{
		name: 'Investigación',
		attribute: 'mind',
		description:
			'Representa tu capacidad para deducir, encontrar pistas ocultas, descifrar códigos y conectar información a partir de la evidencia.',
		hasAdvantage: false,
	},
	{
		name: 'Naturaleza',
		attribute: 'mind',
		description:
			'Mide tu conocimiento sobre flora y fauna, ecosistemas, venenos naturales y remedios herbales.',
		hasAdvantage: false,
	},
	{
		name: 'Religión',
		attribute: 'mind',
		description:
			'Representa tu conocimiento acerca de los panteones, sus dogmas, sus rituales y sus conflictos.',
		hasAdvantage: false,
	},
	// Instinto
	{
		name: 'Percepción',
		attribute: 'instinct',
		description:
			'Tu capacidad para ver, oír u oler detalles sutiles en tu entorno, como detectar una emboscada, encontrar una puerta secreta o notar que alguien está mintiendo.',
		hasAdvantage: false,
	},
	{
		name: 'Perspicacia',
		attribute: 'instinct',
		description:
			'Se usa para leer las intenciones de una criatura, discernir si está diciendo la verdad o sentir sus verdaderas emociones.',
		hasAdvantage: false,
	},
	{
		name: 'Supervivencia',
		attribute: 'instinct',
		description:
			'Mide tu habilidad para seguir rastros, cazar, orientarte en la naturaleza, predecir el clima y evitar peligros naturales.',
		hasAdvantage: false,
	},
	{
		name: 'Trato con Animales',
		attribute: 'instinct',
		description: 'Tu aptitud para calmar, entender y hacerte amigo de los animales.',
		hasAdvantage: false,
	},
	// Presencia
	{
		name: 'Engaño',
		attribute: 'presence',
		description:
			'Tu habilidad para mentir de forma convincente, ya sea ocultando la verdad, diciendo una mentira flagrante o adoptando un disfraz.',
		hasAdvantage: false,
	},
	{
		name: 'Intimidación',
		attribute: 'presence',
		description:
			'Se utiliza para influir en otros a través de amenazas, una conducta hostil o la fuerza de tu presencia.',
		hasAdvantage: false,
	},
	{
		name: 'Interpretación',
		attribute: 'presence',
		description:
			'Refleja tu capacidad para cautivar a una audiencia a través de la música, el baile, la actuación, la oratoria o el relato de historias.',
		hasAdvantage: false,
	},
	{
		name: 'Persuasión',
		attribute: 'presence',
		description:
			'Tu aptitud para convencer a otros a través del tacto, la elocuencia, la buena fe y los argumentos lógicos.',
		hasAdvantage: false,
	},
];

export const generateDefaultSkills = (): Skill[] => {
	return DEFAULT_SKILLS.map((skill) => ({
		...skill,
		id: uuidv4(),
	}));
};
