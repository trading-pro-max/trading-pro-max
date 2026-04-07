import { Router } from "express";
import { getExternalServiceConfig } from "@trading-pro-max/shared";

export const servicesRouter = Router();

servicesRouter.get("/status", (_request, response) => {
  response.json({
    ok: true,
    ...getExternalServiceConfig()
  });
});
