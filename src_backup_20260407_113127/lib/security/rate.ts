import { RateLimiterMemory } from "rate-limiter-flexible";

export const limiter = new RateLimiterMemory({
  points: 20,
  duration: 1,
});
