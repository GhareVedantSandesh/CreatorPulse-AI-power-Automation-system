import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

import path from "path";

const app: Express = express();

// Serve local storage
app.use("/storage", express.static(path.join(process.cwd(), "../../storage")));

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Catch-all 404 for API
app.use("/api", (req, res) => {
  logger.warn({ url: req.originalUrl, method: req.method }, "API Route not found");
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

export default app;
