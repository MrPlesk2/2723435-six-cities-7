import convict from 'convict';
import validator from 'convict-format-with-validator';

convict.addFormats(validator);

export type RestSchema = {
  PORT: number;
  DB_HOST: string;
  SALT: string;
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
  DB_HOST: {
    doc: 'IP address of the database server (MongoDB)',
    format: 'ipaddress',
    env: 'DB_HOST',
    default: null as unknown as string,
  },
  SALT: {
    doc: 'Salt for password hash',
    format: String,
    env: 'SALT',
    default: null as unknown as string,
  },
});
