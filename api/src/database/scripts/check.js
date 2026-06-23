import { checkDatabaseConnection, closeDatabase } from "../pool.js";

try {
  const status = await checkDatabaseConnection();
  console.log(status);
} finally {
  await closeDatabase();
}