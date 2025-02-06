import cors from "cors";
import helmet from "helmet";
import express from "express";
import bodyParser from "body-parser";
import compression from "compression";

import { rateLimit} from "express-rate-limit";
import { initRedis } from "./redis";
import { initCrypto } from "./crypto";
import { webauthnRoutes } from "./webauthn";
import { adminRoutes, initAdmin } from "./admin";
import { applicationKeys, initApplications } from "./application";
import { initServer, serverRoutes } from "./server";

const port = 8080;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per windowMs
});

async function init() {

  if (!await initServer()) {
    console.error("Failed to initialize server");
    return;
  }

  if (!await initCrypto()) {
    console.error("Failed to initialize crypto");
    return;
  }

  if (!await initRedis()) {
    console.error("Failed to initialize redis");
    return;
  }

  if (!await initAdmin()) {
    console.error("Failed to initialize admin");
    return;
  }
  
  if (!await initApplications()) {
    console.error("Failed to initialize applications");
    return;
  }
  
  const app = express();
  
  const corsOptionsDelegate = (req: any, callback: any) => {
    let corsOptions;
  
    const origin = req.header("Origin");
    const method = req.method;
    const isDomainAllowed = applicationKeys.indexOf(origin) !== -1;
    
    console.log(`Request from ${origin} with method ${method} is allowed: ${isDomainAllowed}`);
  
    if (isDomainAllowed) {
      // Enable CORS for this request
      corsOptions = { origin: true, credentials: true };
    } else {
      // Disable CORS for this request
      corsOptions = { origin: false, credentials: false };
    }
    callback(null, corsOptions);
  };

  function cookieParser(req, res, next) {
    var cookies = req.headers.cookie;
    if (cookies) {
      req.cookies = cookies.split(";").reduce((obj, c) => {
        var n = c.split("=");
        obj[n[0].trim()] = n[1].trim();
        return obj
      }, {})
    }
    next();
  }
  
  app.use(limiter);
  app.use(cors(corsOptionsDelegate));
  app.set("trust proxy", true);
  app.use(cookieParser);
  app.use(helmet());
  app.use(compression()); // COMPRESSION
  app.use(bodyParser.json({ limit: "1mb" }));
  app.use("/webauthn", webauthnRoutes);
  app.use("/admin", adminRoutes);
  app.use("/server", serverRoutes);
  
  app.listen(port, () => {
    return console.log(`server is listening on ${port}`);
  });
}

init();
