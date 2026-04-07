import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "TPM_SUPER_SECRET_KEY";

export function signToken(payload: any) {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}
