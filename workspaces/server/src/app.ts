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

import fs from 'fs';
import path from 'path';
import https from 'https';

dotenv.config();

const port = 8080;
const dashboardUrl = process.env.DASHBOARD_SERVER_URL || "http://localhost:9090";
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";
const REDIRECT_URI = 'https://localhost:8080/auth/github/callback';

const sslOptions = {
  // Pfad anpassen, falls die Keys woanders liegen
  key: fs.readFileSync(path.join(__dirname, '../../../certs/localhost+2-key.pem')), 
  cert: fs.readFileSync(path.join(__dirname, '../../../certs/localhost+2.pem'))
};

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
  
    // const origin = req.header("Origin");
    // const method = req.method;
    // let isDomainAllowed = await redisService.checkForDomainInWhiteList(origin);
    
    // console.log(`Request from ${origin} with method ${method} is allowed: ${isDomainAllowed}`);

    const isDomainAllowed = true;
  
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

    // CRITICAL: Allow the popup to keep the opener reference during the redirect
    res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");

    // Für Popup Bridge: JSON zurückgeben
    // Für Direkt-Test im Browser: res.redirect(authorizationUrl) nutzen
    res.redirect(authorizationUrl);
  });

  app.get('/auth/github/callback', async (req: Request, res: Response) => {
    try {
      if (!githubClient) return res.status(500).send('GitHub Client nicht bereit');
      const params = githubClient.callbackParams(req);
      const state = req.session.state;

      // Token Exchange
      const tokenSet = await githubClient.oauthCallback(REDIRECT_URI, params, { state });
      
      // Get User Info
      const userProfile = await githubClient.userinfo(tokenSet.access_token!);

      // Cleanup session
      req.session.state = undefined;

      // Prepare raw data object (Do NOT stringify it yet)
      const userData = {
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email,
        avatar: userProfile.avatar_url // Optional, usually helpful
      };

      // Configuration for the Frontend
      // In production, use process.env.FRONTEND_URL
      const allowedOrigin = 'https://localhost:5173'; 

      // GENERATE HTML SCRIPT
      // This script runs inside the popup, talks to opener, and dies.
      const htmlResponse = `
        <!DOCTYPE html>
        <html>
          <head><title>Authenticating...</title></head>
          <body>
            <p>Authentication successful. Closing...</p>
            <script>
              // 1. Get the data
              const user = ${JSON.stringify(userData)};
              console.log("User");
              console.log(user);
              console.log("Opener");
              console.log(window.opener);
              
              // 2. Send data to the window that opened this popup
              // 'targetOrigin' is crucial for security (don't use '*')
              if (window.opener) {
                console.log("post message");
                window.opener.postMessage({
                  type: 'WEMBAT_LOGIN_SUCCESS',
                  user: user
                }, '${allowedOrigin}');
              }

              // 3. Close the popup
              //window.close();
            </script>
          </body>
        </html>
      `;

      // 1. Allow Inline Scripts (Fixes your previous error)
      res.setHeader("Content-Security-Policy", "script-src 'self' 'unsafe-inline'");

      // 2. Allow window.opener to exist across different ports (Fixes the null opener)
      res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");

      // Send the HTML directly
      res.send(htmlResponse);

    } catch (err) {
      const msg = (err instanceof Error) ? err.message : 'Unknown Error';
      console.error('GitHub Login Fehler:', msg);
      
      // Optional: Send an error message back to the frontend via postMessage too
      // so your app stops loading
      res.status(500).send(`
        <script>
          window.opener.postMessage({ type: 'WEMBAT_LOGIN_ERROR', error: '${msg}' }, '*');
          window.close();
        </script>
      `);
    }
  });
  
  https.createServer(sslOptions, app).listen(port, () => {
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