export interface WorkspaceEnvironment {
  id: string;
  name: string;
  region: string;
  provider: "local" | "cloud";
}

export interface SyncEnvelope<T> {
  workspaceId: string;
  environmentId: string;
  payload: T;
  syncedAt: string;
}

export const defaultEnvironment: WorkspaceEnvironment = {
  id: "env-local",
  name: "Local Operator",
  region: "eu-central",
  provider: "local"
};
