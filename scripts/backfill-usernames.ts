import { backfillUsernames } from "../src/lib/username";

async function main() {
  const updated = await backfillUsernames();
  console.log(`Usernames generate pentru ${updated} utilizatori.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
