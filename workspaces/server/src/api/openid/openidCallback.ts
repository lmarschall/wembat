import { Request, Response } from "express";
import { BaseClient } from "openid-client";
import { authStore } from "#api/auth-store";

export async function openidCallback(req: Request, res: Response, openidClient: BaseClient | undefined, redirectUri: string): Promise<void> {
    try {
        // 1. Retrieve the raw state string from GitHub
        // Fix for S4325: If req.query.state is already typed as string, 'as string' is removed.
        // If not, we force it to string safely.
        const rawState = String(req.query.state || '');

        if (!openidClient) throw new Error('openid client undefined');

        let requestId = "";

        // 2. Decode the State to recover requestId
        const decodedJSON = Buffer.from(rawState, 'base64').toString('ascii');
        const stateObj = JSON.parse(decodedJSON);
        
        requestId = stateObj.requestId;
        const nonce = stateObj.nonce;

        // 3. Security Check: Compare nonce with session
        if (nonce !== req.session.githubState) {
            authStore.fail(requestId, "Security Error: State mismatch");
            throw new Error("Security Check Failed");
        }

        // 4. Prepare parameters for OpenID Client
        const params = openidClient.callbackParams(req);

        // 5. Exchange Code for Token (Pass rawState for validation)
        const tokenSet = await openidClient.oauthCallback(redirectUri, params, { state: rawState });
        
        // 6. Fix for 'tokenSet not found': Ensure tokenSet is valid before using it
        if (!tokenSet || !tokenSet.access_token) {
            throw new Error("No access token received");
        }

        // 7. Get User Info
        const userProfile = await openidClient.userinfo(tokenSet.access_token);
        
        // ... (Create your App JWT) ...
        const appToken = "YOUR_GENERATED_JWT";

        // 8. Save success to store
        authStore.success(requestId, userProfile, appToken);

        // 1. Allow this page to be loaded in the existing popup
        res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');

        // 9. Close Popup
        res.send(authSuccessHtml);
    } catch (error: any) {
        console.log(error);
		res.status(400).send(error.message);
    }
}

// Define the HTML template
const authSuccessHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authentication Successful</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f4f6f8;
        }
        .container {
            text-align: center;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            max-width: 400px;
            width: 90%;
        }
        .icon-circle {
            width: 80px;
            height: 80px;
            background-color: #e6fffa;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
        }
        svg {
            color: #38b2ac;
            width: 40px;
            height: 40px;
        }
        h1 {
            color: #1a202c;
            font-size: 24px;
            margin-bottom: 10px;
        }
        p {
            color: #718096;
            margin-bottom: 24px;
        }
        .btn {
            background-color: #3182ce;
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 5px;
            display: inline-block;
            font-weight: 500;
            transition: background 0.2s;
        }
        .btn:hover {
            background-color: #2b6cb0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon-circle">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
        </div>
        <h1>Authentication Successful</h1>
        <p>You have successfully logged in. You can now return to the application.</p>
        <a href="/" class="btn">Return to Dashboard</a>
    </div>
</body>
</html>
`;