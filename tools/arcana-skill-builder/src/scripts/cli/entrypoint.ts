#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isCardsCliCommand, printCliUsage, runCardsCliCommand } from './index.js';

export const printUsage = (): void => {
	const usage = `
Uso: node dist/index.js <command> [opciones]

Comandos:
  search [opciones]   Busca en el índice global de ARCANA y devuelve referencias
                      ordenadas para abrir la fuente correcta. La salida es JSON
                      compacto y agent-facing: status (found|ambiguous|not_found|
                      invalid_query) y resultados con rank, confidence, kind,
                      name y source (ruta#ancla), más nextAction.
  list [opciones]     Lista cartas de habilidades u objetos mágicos.
  detail <id|slug>    Muestra el detalle de una carta u objeto mágico.
  help                Muestra esta ayuda y la referencia completa de opciones.

La salida de "search" no incluye el documento completo ni el score; usa
"search --explain" solo para depurar coincidencias.

Referencia completa de opciones:
`.trim();

	console.log(usage);
	printCliUsage();
};

const runCli = async (): Promise<void> => {
	const [command = 'help', ...rest] = process.argv.slice(2);

	if (isCardsCliCommand(command)) {
		await runCardsCliCommand(command, rest);
		return;
	}

	switch (command) {
		case 'help':
		case '--help':
		case '-h': {
			printUsage();
			break;
		}
		default: {
			console.error(`Comando desconocido "${command}".`);
			printUsage();
			process.exit(1);
		}
	}
};

const thisFile = fileURLToPath(import.meta.url);
const invokedDirectly = process.argv[1] ? path.resolve(process.argv[1]) === thisFile : false;

if (invokedDirectly) {
	runCli().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
