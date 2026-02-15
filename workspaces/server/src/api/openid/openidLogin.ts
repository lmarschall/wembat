import { Request, Response } from "express";
import { BaseClient, generators } from "openid-client";

export async function openidLogin(req: Request, res: Response, openidClient: BaseClient | undefined): Promise<void> {
  try {
    if (!openidClient) throw new Error('GitHub Client nicht bereit');

    // 1. Get the Request ID from the frontend (polling ID)
    const requestId = req.query.requestId as string;
    
    if (!requestId) throw new Error("Missing requestId parameter");

    // 2. Generate a random nonce for security
    const nonce = generators.state();

    // 3. Pack the requestId and nonce into a JSON object for the state
    // We encode it to Base64 to ensure it travels safely in the URL
    const stateObj = { requestId, nonce };
    const stateString = Buffer.from(JSON.stringify(stateObj)).toString('base64');

    // 4. Store nonce in session to verify later (Anti-CSRF)
    req.session.githubState = nonce;

    const authorizationUrl = openidClient.authorizationUrl({
      scope: 'user:email read:user', 
      state: stateString, // Send the packed string to GitHub
    });

    res.redirect(authorizationUrl); 
  } catch (error: any) {
    console.log(error);
		res.status(400).send(error.message);
  }
}