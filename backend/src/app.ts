import cors from "cors";
import helmet from "helmet";
import express from "express";
import bodyParser from "body-parser";
import compression from "compression";

import { initRedis } from "./redis";
import { initCrypto } from "./crypto";
import { webauthnRoutes } from "./webauthn";
import { applicationTokens, initApplications } from "./application";

const port = process.env.PORT || 8080;

initCrypto();
initRedis();
initApplications();

const app = express();

const corsOptionsDelegate = (req, callback) => {
  let corsOptions;

  const origin = req.header("Origin");

  const isDomainAllowed = Object.keys(applicationTokens).indexOf(origin) !== -1;

  if (isDomainAllowed) {
    // Enable CORS for this request
    corsOptions = { origin: true };
  } else {
    // Disable CORS for this request
    corsOptions = { origin: false };
  }
  callback(null, corsOptions);
};

app.use(cors(corsOptionsDelegate));
app.use(helmet());
app.use(compression()); // COMPRESSION
app.use(bodyParser.json({ limit: "1mb" }));
app.use("/webauthn", webauthnRoutes);

app.listen(port, () => {
  return console.log(`server is listening on ${port}`);
});
