import { getOverview, bootstrapDataLayer } from "../lib/trading";
import { ensureDefaultUser } from "../lib/auth";

async function main() {
  await ensureDefaultUser();
  await bootstrapDataLayer();
  const overview = await getOverview();

  console.log("Trading Pro Max API smoke test");
  console.log(JSON.stringify(overview, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

