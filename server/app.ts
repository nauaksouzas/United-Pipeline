import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import apiRoutes from "./routes.js";

function apiErrorPayload(status: number, message: string, path: string) {
  return {
    error: message,
    status,
    path,
  };
}

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(express.json());
  app.use(cookieParser());

  app.use("/api", (_req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body?: any) => {
      if (
        res.statusCode >= 400 &&
        body &&
        typeof body === "object" &&
        !Array.isArray(body) &&
        "error" in body &&
        !("status" in body)
      ) {
        return originalJson({ ...body, status: res.statusCode });
      }

      return originalJson(body);
    };
    next();
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  app.use("/api", apiRoutes);

  app.use("/api", (req, res) => {
    const status = 404;
    res.status(status).json(apiErrorPayload(
      status,
      `API route not found: ${req.method} ${req.originalUrl}`,
      req.originalUrl,
    ));
  });

  app.use("/api", (err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = Number(err?.status || err?.statusCode || 500);
    const safeStatus = status >= 400 && status < 600 ? status : 500;
    const message = err?.message || "Internal Server Error";

    console.error(`[API Error] ${req.method} ${req.originalUrl}:`, err);

    if (res.headersSent) {
      return;
    }

    res.status(safeStatus).json(apiErrorPayload(safeStatus, message, req.originalUrl));
  });

  return app;
}

const app = createApp();

export default app;
