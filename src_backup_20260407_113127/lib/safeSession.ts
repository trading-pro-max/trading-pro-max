"use client";

export function safeSession(session: any) {
  return session?.data || null;
}
