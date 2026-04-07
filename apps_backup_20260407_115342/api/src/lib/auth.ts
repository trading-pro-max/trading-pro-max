import crypto from "node:crypto";
import type { User } from "@/lib/db";
import { prisma, verifyPassword, hashPassword } from "@/lib/db";
import { config } from "../config";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AccessTokenPayload {
  sid: string;
  uid: string;
  exp: number;
}

function encode(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function decode<T>(input: string): T {
  return JSON.parse(Buffer.from(input, "base64url").toString("utf8")) as T;
}

function signToken(payload: AccessTokenPayload): string {
  const header = encode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = encode(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const signature = crypto.createHmac("sha256", config.authTokenSecret).update(data).digest("base64url");
  return `${data}.${signature}`;
}

function verifySignedToken(token: string): AccessTokenPayload | null {
  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) return null;
  const data = `${header}.${body}`;
  const expected = crypto.createHmac("sha256", config.authTokenSecret).update(data).digest("base64url");
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const payload = decode<AccessTokenPayload>(body);
  if (payload.exp <= Date.now()) return null;
  return payload;
}

function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  };
}

export async function ensureDefaultUser(): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { email: config.demoUser.email } });
  if (existing) return;
  // Seed script should create it, but this keeps boot resilient when user starts API first.
  await prisma.user.create({
    data: {
      email: config.demoUser.email,
      name: config.demoUser.name,
      passwordHash: hashPassword(config.demoUser.password),
      role: "owner"
    }
  });
}

export async function login(email: string, password: string): Promise<{ token: string; user: SessionUser } | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;

  const expiresAt = new Date(Date.now() + config.authTokenTtlHours * 60 * 60 * 1000);
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      expiresAt
    }
  });

  const token = signToken({ sid: session.id, uid: user.id, exp: expiresAt.getTime() });
  return { token, user: toSessionUser(user) };
}

export async function register(name: string, email: string, password: string): Promise<{ token: string; user: SessionUser } | { error: string }> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Email already exists" };
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: hashPassword(password),
      role: "owner"
    }
  });

  const expiresAt = new Date(Date.now() + config.authTokenTtlHours * 60 * 60 * 1000);
  const session = await prisma.session.create({ data: { userId: user.id, expiresAt } });
  const token = signToken({ sid: session.id, uid: user.id, exp: expiresAt.getTime() });
  return { token, user: toSessionUser(user) };
}

export async function getUserFromToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const payload = verifySignedToken(token);
  if (!payload) return null;

  const session = await prisma.session.findUnique({
    where: { id: payload.sid },
    include: { user: true }
  });

  if (!session || session.userId !== payload.uid || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  return toSessionUser(session.user);
}

export async function revokeToken(token: string | undefined): Promise<void> {
  if (!token) return;
  const payload = verifySignedToken(token);
  if (!payload) return;
  await prisma.session.updateMany({
    where: { id: payload.sid, revokedAt: null },
    data: { revokedAt: new Date() }
  });
}

