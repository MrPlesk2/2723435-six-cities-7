#!/usr/bin/env node
import chalk from 'chalk';
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { importOffers } from './cli/import-offers.js';

const helpText = `
${chalk.bold('Программа для подготовки данных для REST API сервера.')}

Введите команду после приглашения. Для выхода используйте exit или quit.

Команды:
 ${chalk.green('--version')}                  выводит номер версии
 ${chalk.green('--help')}                     печатает эту справку
 ${chalk.green('--import <filepath>')}        импортирует данные из TSV
`;

const getVersion = async (): Promise<string> => {
  const packageFile = new URL('../package.json', import.meta.url);
  const packageInfo = JSON.parse(await readFile(packageFile, 'utf-8')) as { version: string };
  return packageInfo.version;
};

const executeCommand = async (command: string, args: string[]): Promise<void> => {
  if (command === '--help') {
    console.log(helpText);
    return;
  }

  if (command === '--version') {
    console.log(chalk.blue(await getVersion()));
    return;
  }

  if (command === '--import') {
    const [filepath] = args;
    if (!filepath) {
      throw new Error('Укажите путь к TSV-файлу: --import <filepath>');
    }
    const offers = await importOffers(filepath);
    console.log(chalk.green(`Импортировано предложений: ${offers.length}`));
    console.log(JSON.stringify(offers, null, 2));
    return;
  }

  throw new Error(`Неизвестная команда: ${command}`);
};

const parseCommand = (line: string): string[] =>
  (line.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [])
    .map((part) => part.replace(/^['"]|['"]$/g, ''));

const runInteractive = async (): Promise<void> => {
  console.log(helpText);
  const input = createInterface({ input: process.stdin, output: process.stdout });
  const prompt = chalk.cyan('six-cities> ');
  process.stdout.write(prompt);

  for await (const line of input) {
    const [command, ...args] = parseCommand(line);
    if (!command) {
      process.stdout.write(prompt);
      continue;
    }
    if (command === 'exit' || command === 'quit') {
      return;
    }

    try {
      await executeCommand(command, args);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(message));
    }
    process.stdout.write(prompt);
  }
};

const run = async (): Promise<void> => {
  const [command, ...args] = process.argv.slice(2);
  if (!command) {
    await runInteractive();
    return;
  }
  await executeCommand(command, args);
};

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red(message));
  process.exitCode = 1;
});
