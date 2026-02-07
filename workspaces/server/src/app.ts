import cors from "cors";
import helmet from "helmet";
import express, { NextFunction, Request } from "express";
import bodyParser from "body-parser";
import compression from "compression";
import { rateLimit} from "express-rate-limit";

import { apiRouter } from "./api";
import { initRedis, redisService } from "./redis";
import { initCrypto, cryptoService } from "./crypto";

import session from 'express-session';
import { Issuer, generators } from 'openid-client';
import dotenv from 'dotenv';

dotenv.config();

const port = 8080;
const dashboardUrl = process.env.DASHBOARD_URL || "http://localhost:9090";

// Konfiguration
const GOOGLE_ISSUER_URL = 'https://accounts.google.com';
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;         // Aus Google Cloud Console
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET; // Aus Google Cloud Console
const REDIRECT_URI = 'http://localhost:3000/auth/google/callback';

let client;

// 2. Initialisierung des OIDC Clients
async function initializeClient() {
  const issuer = await Issuer.discover(GOOGLE_ISSUER_URL);
  console.log('Google OIDC Config geladen');

  client = new issuer.Client({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uris: [REDIRECT_URI],
    response_types: ['code'],
  });
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

  await initializeClient();
  
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
  app.use(cors(corsOptionsDelegate));
  app.set("trust proxy", true);
  app.use((req: any, res: any, next: NextFunction) => cookieParser(req, res, next));
  app.use(helmet());
  app.use(compression());
  app.use(bodyParser.json({ limit: "1mb" }));
  app.use("/api", apiRouter);

  // 1. Session Setup (WICHTIG für PKCE)
  // Wir müssen den "Code Verifier" zwischenspeichern, während der User bei Google ist.
  app.use(session({
    secret: 'ein-sehr-langes-geheimes-random-passwort',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: false, // In Produktion auf 'true' setzen (HTTPS)
      httpOnly: true 
    }
  }));

  // --- ROUTE A: LOGIN STARTEN (PKCE GENERIERUNG) ---
  app.get('/auth/google/login', (req, res) => {
    if (!client) return res.status(500).send('Client nicht initialisiert');

    // A1. PKCE: Generiere den geheimen Verifier
    const code_verifier = generators.codeVerifier();
    
    // A2. PKCE: Speichere ihn in der Session des Users
    req.session.code_verifier = code_verifier;
    
    // A3. PKCE: Generiere den Hash (Challenge) für Google
    const code_challenge = generators.codeChallenge(code_verifier);

    // A4. Generiere die URL
    const authorizationUrl = client.authorizationUrl({
      scope: 'openid email profile',
      code_challenge,
      code_challenge_method: 'S256', // SHA-256 ist Standard
      // state: '...' // Optional: Zusätzlicher CSRF Schutz
    });

    // A5. Leite User zu Google weiter (oder sende URL an Frontend für Popup)
    // Für dein Popup-Szenario würdest du hier eher `res.json({ url: authorizationUrl })` senden.
    res.redirect(authorizationUrl);
  });

  // --- ROUTE B: CALLBACK (PKCE VERIFIZIERUNG & POPUP BRIDGE) ---
  app.get('/auth/google/callback', async (req, res) => {
    try {
      // B1. Parameter aus URL lesen
      const params = client.callbackParams(req);

      // B2. Den Verifier aus der Session holen
      const code_verifier = req.session.code_verifier;
      if (!code_verifier) throw new Error('Kein Verifier in Session gefunden!');

      // B3. Token Exchange mit PKCE Check
      // openid-client sendet hier automatisch den 'code_verifier' mit.
      // Google prüft: Hash(verifier) == code_challenge (von vorher)?
      const tokenSet = await client.callback(REDIRECT_URI, params, { code_verifier });

      // B4. User Daten auslesen
      const claims = tokenSet.claims(); // Enthält sub, email, name, picture
      console.log('User erfolgreich authentifiziert:', claims.email);

      // B5. Session bereinigen
      req.session.code_verifier = null;
      
      // --- DIE POPUP BRIDGE ---
      // Statt Redirect senden wir ein Script, das mit dem Hauptfenster spricht
      const htmlResponse = `
        <!DOCTYPE html>
        <html>
        <head><title>Login erfolgreich</title></head>
        <body>
          <div style="text-align:center; margin-top: 50px; font-family: sans-serif;">
            <h2>Authentifizierung erfolgreich!</h2>
            <p>Dieses Fenster schließt sich gleich...</p>
          </div>
          <script>
            // 1. Datenpaket schnüren
            const message = {
              type: 'WEMBAT_LOGIN_SUCCESS',
              user: {
                id: '${claims.sub}',
                email: '${claims.email}',
                name: '${claims.name}'
              }
            };

            // 2. An das Hauptfenster (Wembat App) senden
            // WICHTIG: Ersetze '*' in Produktion mit deiner echten Origin (z.B. 'https://app.wembat.com')
            if (window.opener) {
              window.opener.postMessage(message, '*');
              window.close();
            } else {
              // Fallback, falls kein Popup
              window.location.href = '/dashboard'; 
            }
          </script>
        </body>
        </html>
      `;

      res.send(htmlResponse);

    } catch (err) {
      console.error('Callback Fehler:', err);
      res.status(500).send('Login fehlgeschlagen: ' + err.message);
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