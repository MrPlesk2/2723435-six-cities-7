import convict from 'convict';
import validator from 'convict-format-with-validator';

convict.addFormats(validator);

export type RestSchema = {
  PORT: number;
  SALT: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
};

// Convict reads process.env when the schema is created,
// so call this only after dotenv has loaded the .env file.
// Defaults are null on purpose: every variable must be set,
// otherwise validation fails and the app stops.
export const createRestSchema = () => convict<RestSchema>({
  PORT: {
    doc: 'Port for incoming connections',
    format: 'port',
    env: 'PORT',
    default: null as unknown as number,
  },
  SALT: {
    doc: 'Salt for password hash',
    format: String,
    env: 'SALT',
    default: null as unknown as string,
  },
  DB_HOST: {
    doc: 'IP address of the database server (MongoDB)',
    format: 'ipaddress',
    env: 'DB_HOST',
    default: null as unknown as string,
  },
  DB_PORT: {
    doc: 'Port of the database server (MongoDB)',
    format: 'port',
    env: 'DB_PORT',
    default: null as unknown as number,
  },
  DB_USER: {
    doc: 'Username to connect to the database',
    format: String,
    env: 'DB_USER',
    default: null as unknown as string,
  },
  DB_PASSWORD: {
    doc: 'Password to connect to the database',
    format: String,
    env: 'DB_PASSWORD',
    default: null as unknown as string,
    sensitive: true,
  },
  DB_NAME: {
    doc: 'Database name (MongoDB)',
    format: String,
    env: 'DB_NAME',
    default: null as unknown as string,
  },
});
