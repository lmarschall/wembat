import cors from "cors";
import helmet from "helmet";
import express, { NextFunction, Request, Response } from "express";
import bodyParser from "body-parser";
import compression from "compression";
import { rateLimit} from "express-rate-limit";

import { apiRouter } from "./api";
import { initRedis, redisService } from "./redis";
import { initCrypto, cryptoService } from "./crypto";
import { authStore } from './auth-store';

import session from 'express-session';
import { BaseClient, Issuer, generators } from 'openid-client';
import dotenv from 'dotenv';

import fs from 'fs';
import path from 'path';
import https from 'https';

declare module 'express-session' {
  interface SessionData {
    githubState: string; // Add your custom properties here
  }
}

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

    // 1. Get the Request ID from the frontend (polling ID)
    const requestId = req.query.requestId as string;
    
    if (!requestId) {
        return res.status(400).send("Missing requestId parameter");
    }

    // 2. Generate a random nonce for security
    const nonce = generators.state();

    // 3. Pack the requestId and nonce into a JSON object for the state
    // We encode it to Base64 to ensure it travels safely in the URL
    const stateObj = { requestId, nonce };
    const stateString = Buffer.from(JSON.stringify(stateObj)).toString('base64');

    // 4. Store nonce in session to verify later (Anti-CSRF)
    req.session.githubState = nonce;

    const authorizationUrl = githubClient.authorizationUrl({
      scope: 'user:email read:user', 
      state: stateString, // Send the packed string to GitHub
    });

    res.redirect(authorizationUrl);
  });

  app.get('/auth/github/callback', async (req: Request, res: Response) => {
    // 1. Retrieve the raw state string from GitHub
    // Fix for S4325: If req.query.state is already typed as string, 'as string' is removed.
    // If not, we force it to string safely.
    const rawState = String(req.query.state || '');

    if (!githubClient) return res.status(500).send('GitHub Client nicht bereit');

    let requestId = "";

    try {
      // 2. Decode the State to recover requestId
      const decodedJSON = Buffer.from(rawState, 'base64').toString('ascii');
      const stateObj = JSON.parse(decodedJSON);
      
      requestId = stateObj.requestId;
      const nonce = stateObj.nonce;

      // 3. Security Check: Compare nonce with session
      if (nonce !== req.session.githubState) {
          authStore.fail(requestId, "Security Error: State mismatch");
          return res.status(403).send("Security Check Failed");
      }

      // 4. Prepare parameters for OpenID Client
      const params = githubClient.callbackParams(req);

      // 5. Exchange Code for Token (Pass rawState for validation)
      const tokenSet = await githubClient.oauthCallback(REDIRECT_URI, params, { state: rawState });
      
      // 6. Fix for 'tokenSet not found': Ensure tokenSet is valid before using it
      if (!tokenSet || !tokenSet.access_token) {
          throw new Error("No access token received");
      }

      // 7. Get User Info
      const userProfile = await githubClient.userinfo(tokenSet.access_token);

      // console.log(userProfile);
      
      // ... (Create your App JWT) ...
      const appToken = "YOUR_GENERATED_JWT";

      // 8. Save success to store
      authStore.success(requestId, userProfile, appToken);

      // 9. Close Popup
      res.send(`<script>window.close();</script>`);

    } catch (err: any) {
      console.error("Login Error:", err);
      // Only try to update store if we successfully recovered the requestId
      if (requestId) {
          authStore.fail(requestId, "Login Failed");
      }
      res.status(500).send(`<script>alert('Login failed'); window.close();</script>`);
    }
  });

  app.get('/auth/poll', (req: Request, res: Response) => {
    const requestId = req.query.requestId as string;

    if (!requestId) {
      return res.status(400).json({ error: 'Missing requestId' });
    }

    const state = authStore.get(requestId);

    // console.log(state);

    // Case 1: ID not found (Expired or never started)
    if (!state) {
      return res.status(404).json({ status: 'unknown', message: 'Session not found or expired' });
    }

    // Case 2: Still waiting for user to login
    if (state.status === 'pending') {
      return res.json({ status: 'pending' });
    }

    // Case 3: Success!
    if (state.status === 'success') {
      // CRITICAL: Delete the data immediately so it can't be fetched again (Replay Protection)
      authStore.delete(requestId);
      
      return res.json({
        status: 'success',
        user: state.user,
        token: state.token // Your JWT or Session ID
      });
    }

    // Case 4: Error during login
    if (state.status === 'error') {
      authStore.delete(requestId);
      return res.json({ status: 'error', message: state.error });
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