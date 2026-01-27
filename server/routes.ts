import type { Express } from "express";
import { createServer, type Server } from "http";

import vvicRouter from "./vvic";
import alibaba1688Router from "./1688";

export function registerRoutes(app: Express): Server {
  app.get("/api/me", (req, res) => {
    return res.json({ ok: true, user: null });
  });

  app.use("/api/vvic", vvicRouter);
  app.use("/api/1688", alibaba1688Router);

  app.use("/api", (req, res) => {
    return res.status(404).json({
      ok: false,
      error: "api_not_found",
      path: req.originalUrl,
    });
  });

  return createServer(app);
}
