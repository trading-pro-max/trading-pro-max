import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function requirePremium() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    throw new Error("NOT_AUTHENTICATED");
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user || user.plan !== "premium") {
    throw new Error("NOT_PREMIUM");
  }

  return user;
}
