import cors from "cors";
import helmet from "helmet";
import express, { NextFunction, Request, Response } from "express";
import bodyParser from "body-parser";
import compression from "compression";
import { rateLimit} from "express-rate-limit";

import { createAPIRouter } from "#api";
import { initRedis, redisService } from "#redis";
import { initCrypto, cryptoService } from "#crypto";
import { configService, initConfig } from "#config";
import session from 'express-session';

const port = 8080;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per windowMs
});

async function init() {

  if (!await initConfig()) {
    console.error("Failed to initialize config");
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

  // await initOpenIdClient();
  
  const app = express();
  
  const corsOptionsDelegate = async (req: any, callback: any) => {
    let corsOptions;
  
    const origin = req.header("Origin");
    const method = req.method;
    let isDomainAllowed = await redisService.checkForDomainInWhiteList(origin);
    
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

  function cookieParser(req: Request, res: Response, next: NextFunction) {
    var cookies = req.headers.cookie;
    if (cookies) {
      req.cookies = cookies.split(";").reduce((obj: Record<string, string>, c) => {
        var n: any = c.split("=");
        obj[n[0].trim()] = n[1].trim();
        return obj;
      }, {});
    }
    next();
  }
  
  app.use(limiter);
  app.use(cors(corsOptionsDelegate));
  app.set("trust proxy", true);
  app.use((req: any, res: any, next: NextFunction) => cookieParser(req, res, next));
  app.use(helmet());
  app.use(compression());
  app.use(bodyParser.json({ limit: "1mb" }));

  app.use(session({
    secret: 'super-secret-session-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: true, httpOnly: true }
  }));

  app.use("/api", createAPIRouter());
  
  app.listen(port, () => {
    return console.log(`server is listening on ${port}`);
  });
}

init();

async function initAdmin(): Promise<boolean> {
	try {
		const token = await cryptoService.createAdminJWT();
		console.log(`Dashboard Url: ${configService.getDashboardUrl()}/${token}`);
		return true;
	} catch (err) {
		console.error(err);
		return false;
	}
}