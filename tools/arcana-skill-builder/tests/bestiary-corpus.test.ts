import { sha1 } from 'js-sha1';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';

import { CONFIG } from '../src/config.js';
import { loadBestiaryCreatures } from '../src/loaders/bestiary-loader.js';

const newCreatureNames = [
	'Kobold',
	'Estirge',
	'Armadura Animada',
	'Cubo Gelatinoso',
	'Dríada',
	'Fuego Fatuo',
	'Fantasma',
	'Saga',
	'Bulette',
	'Ent',
	'Gigante de Fuego',
	'Aboleth',
	'Cambiaformas',
	'Guerrero Gnoll',
	'Soldado',
	'Sacerdote Gnoll',
	'Sabueso Infernal',
	'Hombre Lobo',
	'Momia',
	'Remorhaz',
	'Gusano Gigante',
	'Roc',
	'Contemplador',
	'Harpía',
];

const findCreature = (name: string) => {
	const creature = loadBestiaryCreatures().find((candidate) => candidate.name === name);
	assert.ok(creature, `missing creature ${name}`);
	return creature;
};

const findAction = (name: string, collection: ReturnType<typeof findCreature>['actions']) => {
	const action = collection.find((candidate) => candidate.name === name);
	assert.ok(action, `missing action ${name}`);
	return action;
};

const findAttack = (name: string, collection: ReturnType<typeof findCreature>['attacks']) => {
	const attack = collection.find((candidate) => candidate.name === name);
	assert.ok(attack, `missing attack ${name}`);
	return attack;
};

const findTrait = (name: string, collection: ReturnType<typeof findCreature>['traits']) => {
	const trait = collection.find((candidate) => candidate.name === name);
	assert.ok(trait, `missing trait ${name}`);
	return trait;
};

describe('current bestiary corpus', () => {
	test('loads the complete manifest and preserves the approved additions', () => {
		const manifestPath = path.join(
			CONFIG.DOCS_PATH,
			CONFIG.BESTIARY_SOURCE_DIR,
			CONFIG.BESTIARY_MANIFEST_FILE,
		);
		const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as { files: string[] };
		const creatures = loadBestiaryCreatures();

		assert.equal(manifest.files.length, 66);
		assert.equal(new Set(manifest.files).size, manifest.files.length);
		assert.equal(creatures.length, 66);
		assert.deepEqual(
			creatures.slice(-newCreatureNames.length).map((creature) => creature.name),
			newCreatureNames,
		);
		for (const filename of manifest.files) {
			assert.ok(
				fs.existsSync(path.join(CONFIG.DOCS_PATH, CONFIG.BESTIARY_SOURCE_DIR, filename)),
				filename,
			);
		}
	});

	test('keeps the approved defensive and reload mechanics in mapped creatures', () => {
		const driada = findCreature('Dríada');
		const aboleth = findCreature('Aboleth');
		const ent = findCreature('Ent');
		const saga = findCreature('Saga');

		assert.equal(
			driada.traits.find((trait) => trait.name === 'Naturaleza Antimága')?.detail,
			'Ventaja (+1d4) en Tiradas de Salvación contra conjuros y efectos mágicos.',
		);
		assert.deepEqual(findAction('Prisión de Raíces', driada.actions).uses, {
			type: 'RELOAD',
			qty: 5,
		});
		assert.deepEqual(findAction('Moldear la Mente', aboleth.actions).uses, {
			type: 'RELOAD',
			qty: 6,
		});
		assert.match(findAction('La Arboleda se Alza', ent.actions).detail, /su propio turno/);
		assert.match(findAction('Manto de Mal Agüero', saga.actions).detail, /2 metros de radio/);
	});

	test('preserves Guardia identity while adding a ranged alternative', () => {
		const guardia = findCreature('Guardia');

		assert.equal(guardia.id, sha1('Guardia'));
		assert.equal(guardia.tier, 1);
		assert.deepEqual(findAttack('Ballesta Ligera', guardia.attacks), {
			name: 'Ballesta Ligera',
			bonus: 3,
			damage: '1d6 Perforante',
			note: 'Alcance Media, Recarga (Interacción)',
		});
	});

	test('models Cambiaformas as a simple Aberración with body-made equipment', () => {
		const cambiaformas = findCreature('Cambiaformas');

		assert.equal(cambiaformas.lineage, 'Aberración');
		assert.deepEqual(
			cambiaformas.attacks.map((attack) => attack.name),
			['Extremidad Cortante', 'Extremidad Perforante'],
		);
		assert.match(
			findTrait('Asalto Múltiple', cambiaformas.traits).detail,
			/Extremidad Cortante.*Extremidad Perforante/,
		);
		assert.match(findTrait('Cuerpo Simulante', cambiaformas.traits).detail, /fragmento inerte/);
		assert.equal(cambiaformas.actions.length, 0);
		assert.equal(cambiaformas.reactions.length, 0);
	});

	test('keeps Gnoll howl as an interaction and replaces Soldier advance', () => {
		const guerreroGnoll = findCreature('Guerrero Gnoll');
		const soldado = findCreature('Soldado');

		assert.equal(findAction('Aullido de Acoso', guerreroGnoll.interactions).uses?.qty, 5);
		assert.equal(
			guerreroGnoll.actions.some((action) => action.name === 'Aullido de Acoso'),
			false,
		);
		assert.equal(
			soldado.traits.some((trait) => trait.name === 'Avance Ordenado'),
			false,
		);
		assert.match(findAction('Desafío de Línea', soldado.actions).detail, /Desventaja/);
	});

	test('gives the Gnoll priest durable fear, group support, healing and range', () => {
		const sacerdote = findCreature('Sacerdote Gnoll');
		const mandato = findAction('Mandato de la Jauría', sacerdote.actions);
		const liturgia = findAction('Liturgia del Cazador', sacerdote.actions);
		const ofrenda = findAction('Ofrenda de Sangre', sacerdote.actions);

		assert.match(mandato.detail, /1 minuto/);
		assert.match(mandato.detail, /al final de cada uno de sus turnos/);
		assert.match(liturgia.detail, /Hasta 3 aliados Gnoll/);
		assert.match(ofrenda.detail, /2d6/);
		assert.equal(findAttack('Lanza de Sangre', sacerdote.attacks).note, 'Alcance Media');
	});

	test('balances Hell Hound at tier 2 around pack attacks and a longer cone', () => {
		const sabueso = findCreature('Sabueso Infernal');

		assert.equal(sabueso.tier, 2);
		assert.match(findTrait('Asalto Múltiple', sabueso.traits).detail, /otro Sabueso Infernal/);
		assert.match(
			findAction('Soplo de Brasas', sabueso.actions).detail,
			/cono de distancia Cercana/,
		);
		assert.match(findAction('Soplo de Brasas', sabueso.actions).detail, /1d6 de daño Fuego/);
	});

	test('requires reactions for every new creature from tier 4 onward', () => {
		for (const name of ['Momia', 'Remorhaz', 'Gusano Gigante', 'Roc', 'Contemplador']) {
			assert.ok(findCreature(name).reactions.length > 0, `${name} needs a reaction`);
		}
	});

	test('uses one-minute fear with repeated saves for higher-rank creatures', () => {
		const fearedActions = [
			findAction('Mandato de la Jauría', findCreature('Sacerdote Gnoll').actions),
			findAction('Maldición de la Garganta Seca', findCreature('Momia').actions),
		];

		for (const action of fearedActions) {
			assert.match(action.detail, /1 minuto/);
			assert.match(action.detail, /al final de cada uno de sus turnos/);
		}
	});

	test('documents the generic magic advantage rule in the GM manual', () => {
		const gmManual = fs.readFileSync(path.join(CONFIG.DOCS_PATH, CONFIG.GM_MANUAL_FILE), 'utf-8');

		assert.match(
			gmManual,
			/\*\*Ventaja contra efectos mágicos \(Coste: 2 PD\):\*\* la criatura obtiene Ventaja \(\+1d4\) en todas las Tiradas de Salvación contra conjuros y efectos mágicos/,
		);
		assert.match(gmManual, /no otorga resistencia al daño mágico/);
	});
});
