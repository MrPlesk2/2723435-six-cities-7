#!/usr/bin/env node
import chalk from 'chalk';
import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import type { CityName, HousingType, Location, Offer, UserType } from './types.js';

const helpText = `
${chalk.bold('Программа для подготовки данных для REST API сервера.')}

Введите команду после приглашения. Для выхода используйте exit или quit.

Команды:
 ${chalk.green('--version')}                  выводит номер версии
 ${chalk.green('--help')}                     печатает эту справку
 ${chalk.green('--import <filepath>')}        импортирует данные из TSV
`;

const cityLocations: Record<CityName, Location> = {
  Paris: { latitude: 48.85661, longitude: 2.351499 },
  Cologne: { latitude: 50.938361, longitude: 6.959974 },
  Brussels: { latitude: 50.846557, longitude: 4.351697 },
  Amsterdam: { latitude: 52.370216, longitude: 4.895168 },
  Hamburg: { latitude: 53.550341, longitude: 10.000654 },
  Dusseldorf: { latitude: 51.225402, longitude: 6.776314 },
};

const housingTypes: readonly HousingType[] = ['apartment', 'house', 'room', 'hotel'];
const userTypes: readonly UserType[] = ['обычный', 'pro'];
const amenities = [
  'Breakfast',
  'Air conditioning',
  'Laptop friendly workspace',
  'Baby seat',
  'Washer',
  'Towels',
  'Fridge',
] as const;

const parseRequiredString = (
  value: string,
  field: string,
  minLength = 1,
  maxLength = Number.POSITIVE_INFINITY,
): string => {
  const result = value.trim();
  if (result.length < minLength || result.length > maxLength) {
    throw new Error(`Поле «${field}» должно содержать от ${minLength} до ${maxLength} символов`);
  }
  return result;
};

const parseEnum = <T extends string>(value: string, field: string, options: readonly T[]): T => {
  const result = value.trim();
  if (!options.some((option) => option === result)) {
    throw new Error(`Недопустимое значение поля «${field}»: ${value}`);
  }
  return result as T;
};

const parseNumber = (
  value: string,
  field: string,
  min: number,
  max: number,
  integer = false,
  maxDecimalPlaces?: number,
): number => {
  const normalized = value.trim();
  const result = Number(normalized);
  const decimalPlaces = normalized.split('.')[1]?.length ?? 0;
  if (
    normalized === ''
    || !Number.isFinite(result)
    || result < min
    || result > max
    || (integer && !Number.isInteger(result))
    || (maxDecimalPlaces !== undefined && decimalPlaces > maxDecimalPlaces)
  ) {
    throw new Error(`Некорректное значение поля «${field}»: ${value}`);
  }
  return result;
};

const parseBoolean = (value: string, field: string): boolean => {
  const normalized = value.trim();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }
  throw new Error(`Поле «${field}» должно содержать true или false`);
};

const parseDate = (value: string, field: string): Date => {
  const result = new Date(value);
  if (Number.isNaN(result.getTime())) {
    throw new Error(`Некорректная дата в поле «${field}»: ${value}`);
  }
  return result;
};

const parseEmail = (value: string): string => {
  const result = parseRequiredString(value, 'authorEmail');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) {
    throw new Error(`Некорректный email автора: ${value}`);
  }
  return result;
};

const parseOffer = (line: string, lineNumber: number): Offer => {
  const values = line.split('\t');
  if (values.length !== 20) {
    throw new Error(`Строка ${lineNumber}: ожидалось 20 полей, получено ${values.length}`);
  }

  const [
    titleValue, descriptionValue, publishedAt, cityNameValue, previewImageValue, imagesValue, isPremium,
    isFavorite, rating, housingType, bedrooms, maxAdults, price, goods, authorName,
    authorEmail, authorAvatarUrl, authorType, latitude, longitude,
  ] = values;

  const cityName = parseEnum(cityNameValue, 'city', Object.keys(cityLocations) as CityName[]);
  const imageList = imagesValue.split(',').map((image) => image.trim());
  if (imageList.length !== 6 || imageList.some((image) => image.length === 0)) {
    throw new Error(`Строка ${lineNumber}: предложение должно содержать ровно 6 фотографий`);
  }
  const amenityList = goods.split(',').map((amenity) => parseEnum(amenity, 'goods', amenities));
  const avatarUrl = authorAvatarUrl.trim();
  if (avatarUrl && !/\.png$|\.jpg$/i.test(avatarUrl)) {
    throw new Error(`Аватар автора должен иметь формат .jpg или .png: ${authorAvatarUrl}`);
  }
  const ratingValue = parseNumber(rating, 'rating', 1, 5, false, 1);

  return {
    title: parseRequiredString(titleValue, 'title', 10, 100),
    description: parseRequiredString(descriptionValue, 'description', 20, 1024),
    publishedAt: parseDate(publishedAt, 'publishedAt'),
    city: { name: cityName, location: cityLocations[cityName] },
    previewImage: parseRequiredString(previewImageValue, 'previewImage'),
    images: imageList,
    isPremium: parseBoolean(isPremium, 'isPremium'),
    isFavorite: parseBoolean(isFavorite, 'isFavorite'),
    rating: ratingValue,
    type: parseEnum(housingType, 'type', housingTypes),
    bedrooms: parseNumber(bedrooms, 'bedrooms', 1, 8, true),
    maxAdults: parseNumber(maxAdults, 'maxAdults', 1, 10, true),
    price: parseNumber(price, 'price', 100, 100000, true),
    goods: amenityList,
    author: {
      name: parseRequiredString(authorName, 'authorName', 1, 15),
      email: parseEmail(authorEmail),
      avatarUrl: avatarUrl || undefined,
      type: parseEnum(authorType, 'authorType', userTypes),
    },
    commentsCount: 0,
    location: {
      latitude: parseNumber(latitude, 'latitude', -90, 90),
      longitude: parseNumber(longitude, 'longitude', -180, 180),
    },
  };
};

const importOffers = async (filepath: string): Promise<Offer[]> => {
  const input = createReadStream(filepath, { encoding: 'utf-8' });
  const lines = createInterface({ input, crlfDelay: Infinity });
  const offers: Offer[] = [];
  let lineNumber = 0;

  for await (const line of lines) {
    lineNumber += 1;
    if (lineNumber === 1 && line.startsWith('title\t')) {
      continue;
    }
    if (line.trim()) {
      offers.push(parseOffer(line, lineNumber));
    }
  }

  return offers;
};

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
