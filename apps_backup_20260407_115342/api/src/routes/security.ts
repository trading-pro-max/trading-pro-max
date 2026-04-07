import { Router } from "express";
import { getSecurityStatus } from "../lib/security";

export const securityRouter = Router();

securityRouter.get("/status", (_request, response) => {
  response.json(getSecurityStatus());
});
