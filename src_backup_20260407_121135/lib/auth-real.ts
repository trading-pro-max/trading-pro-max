export type AuthUser = {
  email: string;
};

export const cookieOptions = {} as const;

export function signAuthToken(payload: any) {
  return String(payload?.email || "user");
}