#!/usr/bin/env node
import chalk from 'chalk';
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { generateOffers } from './cli/generate-offers.js';
import { importOffers } from './cli/import-offers.js';

const helpText = `
${chalk.bold('Программа для подготовки данных для REST API сервера.')}

Введите команду после приглашения. Для выхода используйте exit или quit.

Команды:
 ${chalk.green('--version')}                  выводит номер версии
 ${chalk.green('--help')}                     печатает эту справку
 ${chalk.green('--import <filepath>')}        импортирует данные из TSV
 ${chalk.green('--generate <n> <filepath> <url>')} генерирует тестовые данные
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
    const offersCount = await importOffers(filepath, undefined, (count) => {
      console.log(`Обработано предложений: ${count}`);
    });
    console.log(chalk.green(`Импортировано предложений: ${offersCount}`));
    return;
  }

  if (command === '--generate') {
    const [count, filepath, url] = args;
    if (!count || !filepath || !url) {
      throw new Error('Использование: --generate <n> <filepath> <url>');
    }
    const generatedCount = await generateOffers(count, filepath, url);
    console.log(chalk.green(`Сгенерировано предложений: ${generatedCount}`));
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
