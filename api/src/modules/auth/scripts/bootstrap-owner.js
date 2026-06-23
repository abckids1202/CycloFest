import { closeDatabase } from "../../../database/pool.js";
import { createInitialOwner } from "../auth.service.js";

const input = {
  email: process.env.BOOTSTRAP_OWNER_EMAIL,
  fullName: process.env.BOOTSTRAP_OWNER_NAME,
  password: process.env.BOOTSTRAP_OWNER_PASSWORD
};

try {
  const owner = await createInitialOwner(input);
  console.log(
    `Organizer owner ready: ${owner.user.email} -> ${owner.event.name} (${owner.role})`
  );
} finally {
  await closeDatabase();
}