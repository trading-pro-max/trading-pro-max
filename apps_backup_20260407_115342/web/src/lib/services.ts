const API_BASE =
  (import.meta as any)?.env?.VITE_API_URL?.replace(/\/$/, "") ||
  "http://localhost:8787";

export async function getServicesStatus() {
  const response = await fetch(`${API_BASE}/api/services/status`);
  if (!response.ok) {
    throw new Error("Failed to load services status");
  }
  return response.json();
}
