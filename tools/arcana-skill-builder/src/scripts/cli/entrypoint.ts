#!/usr/bin/env node
import { isCardsCliCommand, printCliUsage, runCardsCliCommand } from './index.js';

const printUsage = (): void => {
	console.log('Usage: node dist/index.js <command> [options]');
	console.log('');
	console.log('Commands:');
	console.log('  list [opciones]            Lista cartas de habilidades u objetos mágicos.');
	console.log('  detail <id|slug|nombre>    Muestra el detalle de una carta específica.');
	console.log('  help                       Muestra este mensaje de ayuda.');
	console.log('');
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

runCli().catch((err) => {
	console.error(err);
	process.exit(1);
});
