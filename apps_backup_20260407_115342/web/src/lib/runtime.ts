export async function getRuntimeConfig() {
  const base =
    (import.meta as any)?.env?.VITE_API_URL?.replace(/\/$/, "") ||
    "http://localhost:8787";

  const response = await fetch(`${base}/api/runtime-config`);
  if (!response.ok) {
    throw new Error("Failed to load runtime config");
  }

  return response.json();
}
