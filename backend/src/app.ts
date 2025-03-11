import cors from "cors";
import helmet from "helmet";
import express, { Request } from "express";
import bodyParser from "body-parser";
import compression from "compression";
import { rateLimit} from "express-rate-limit";

import { apiRouter } from "./api";
import { initRedis } from "./redis";
import { PrismaClient } from "@prisma/client";
import { createAdminJWT, initCrypto } from "./crypto";

const port = 8080;
const dashboardUrl = process.env.DASHBOARD_URL || "http://localhost:9090";
const prisma = new PrismaClient();
export const domainWhitelist = new Array<string>();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per windowMs
});

async function init() {

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
  
  if (!await initWhitelist()) {
    console.error("Failed to initialize applications");
    return;
  }
  
  const app = express();
  
  const corsOptionsDelegate = (req: any, callback: any) => {
    let corsOptions;
  
    const origin = req.header("Origin");
    const method = req.method;
    const isDomainAllowed = domainWhitelist.indexOf(origin) !== -1;
    
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

  function cookieParser(req: Request, res: Response, next) {
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
  app.use("/api", apiRouter);
  
  app.listen(port, () => {
    return console.log(`server is listening on ${port}`);
  });
}

init();

async function initAdmin(): Promise<boolean> {
	try {
		const token = await createAdminJWT();
		console.log(`Dashboard Url: ${dashboardUrl}/${token}`);
		return true;
	} catch (err) {
		console.error(err);
		return false;
	}
}

async function initWhitelist(): Promise<boolean> {
	try {
		
		const apps = await prisma.application.findMany();

		for (const app of apps) {
			const appUrl = `https://${app.domain}`;
			domainWhitelist.push(appUrl);
		}
		domainWhitelist.push(dashboardUrl);
		return true;
	} catch (err) {
		console.error(err);
		return false;
	}
}