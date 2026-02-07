import cors from "cors";
import helmet from "helmet";
import express, { NextFunction, Request, Response } from "express";
import bodyParser from "body-parser";
import compression from "compression";
import { rateLimit} from "express-rate-limit";

import { apiRouter } from "./api";
import { initRedis, redisService } from "./redis";
import { initCrypto, cryptoService } from "./crypto";

import session from 'express-session';
import { BaseClient, Issuer, generators } from 'openid-client';
import dotenv from 'dotenv';

dotenv.config();

const port = 8080;
const dashboardUrl = process.env.DASHBOARD_URL || "http://localhost:9090";
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";
const REDIRECT_URI = 'http://localhost:8080/auth/github/callback';

declare module 'express-session' {
  interface SessionData {
    code_verifier?: string;
    state?: string;
  }
}

let githubClient: BaseClient | undefined;

async function initializeGitHub() {
  console.log("init github");
  const githubIssuer = new Issuer({
    issuer: 'https://github.com',
    authorization_endpoint: 'https://github.com/login/oauth/authorize',
    token_endpoint: 'https://github.com/login/oauth/access_token',
    userinfo_endpoint: 'https://api.github.com/user',
  });

  githubClient = new githubIssuer.Client({
    client_id: GITHUB_CLIENT_ID,
    client_secret: GITHUB_CLIENT_SECRET,
    redirect_uris: [REDIRECT_URI],
    response_types: ['code'],
  });
  
  console.log('GitHub OAuth Config geladen');
}

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

  await initializeGitHub();
  
  const app = express();
  
  const corsOptionsDelegate = async (req: any, callback: any) => {
    let corsOptions;
  
    const origin = req.header("Origin");
    const method = req.method;
    const isDomainAllowed = await redisService.checkForDomainInWhiteList(origin);
    
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
  // app.use(cors(corsOptionsDelegate));
  // app.set("trust proxy", true);
  app.use((req: any, res: any, next: NextFunction) => cookieParser(req, res, next));
  app.use(helmet());
  app.use(compression());
  app.use(bodyParser.json({ limit: "1mb" }));
  app.use("/api", apiRouter);

  app.use(session({
    secret: 'super-secret-session-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true }
  }));

  app.get('/auth/github/login', (req: Request, res: Response) => {
    if (!githubClient) return res.status(500).send('GitHub Client nicht bereit');

    // State generieren (wichtig für Sicherheit bei OAuth)
    const state = generators.state();
    req.session.state = state;

    const authorizationUrl = githubClient.authorizationUrl({
      scope: 'user:email read:user', // GitHub spezifische Scopes
      state: state,
    });

    // Für Popup Bridge: JSON zurückgeben
    // Für Direkt-Test im Browser: res.redirect(authorizationUrl) nutzen
    res.json({ url: authorizationUrl });
  });

  app.get('/auth/github/callback', async (req: Request, res: Response) => {
    try {
      if (!githubClient) return res.status(500).send('GitHub Client nicht bereit');
      const params = githubClient.callbackParams(req);
      const state = req.session.state;

      // Token Exchange
      const tokenSet = await githubClient.callback(REDIRECT_URI, params, { state });
      
      // WICHTIG BEI GITHUB:
      // GitHub sendet kein ID-Token (JWT) zurück, sondern nur ein Access Token.
      // Wir müssen die User-Infos manuell abrufen.
      const userProfile = await githubClient.userinfo(tokenSet.access_token!);

      // Aufräumen
      req.session.state = undefined;

      // Popup Response
      const htmlResponse = `
        <!DOCTYPE html>
        <html>
        <body>
          <script>
            const message = {
              type: 'WEMBAT_LOGIN_SUCCESS', // Das hört dein Frontend
              provider: 'github',
              user: {
                id: '${userProfile.id}',
                username: '${userProfile.login}', // GitHub Username
                name: '${userProfile.name || userProfile.login}',
                email: '${userProfile.email}' // Kann null sein, wenn private!
              }
            };
            
            if (window.opener) {
              window.opener.postMessage(message, '*');
              window.close();
            } else {
              document.write('Login erfolgreich: ' + JSON.stringify(message.user));
            }
          </script>
          <h1>GitHub Login erfolgreich.</h1>
        </body>
        </html>
      `;

      res.send(htmlResponse);

    } catch (err) {
      const msg = (err instanceof Error) ? err.message : 'Unknown Error';
      console.error('GitHub Login Fehler:', msg);
      res.status(500).send('Login Error: ' + msg);
    }
  });
  
  app.listen(port, () => {
    return console.log(`server is listening on ${port}`);
  });
}

init();

async function initAdmin(): Promise<boolean> {
	try {
		const token = await cryptoService.createAdminJWT();
		console.log(`Dashboard Url: ${dashboardUrl}/${token}`);
		return true;
	} catch (err) {
		console.error(err);
		return false;
	}
}