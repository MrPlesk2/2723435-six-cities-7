export function getMongoURI(
  username: string,
  password: string,
  host: string,
  port: number,
  databaseName: string,
): string {
  const credentials = `${encodeURIComponent(username)}:${encodeURIComponent(password)}`;
  return `mongodb://${credentials}@${host}:${port}/${databaseName}?authSource=admin`;
}
