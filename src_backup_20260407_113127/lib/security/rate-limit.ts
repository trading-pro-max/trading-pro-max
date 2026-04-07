import { RateLimiterMemory } from "rate-limiter-flexible";

const rateLimiter = new RateLimiterMemory({
  points: 20, // ÚÏÏ ÇáØáÈÇÊ
  duration: 10, // ÎáÇá 10 ËæÇäí
});

export async function protectRateLimit(ip: string) {
  try {
    await rateLimiter.consume(ip);
    return true;
  } catch {
    return false;
  }
}
