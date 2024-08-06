import base64url from "base64url";
import { PrismaClient, Session } from "@prisma/client";
import { createSessionJWT } from "../../crypto";
import { addToWebAuthnTokens } from "../../redis";
import { verifyAuthenticationResponse, VerifyAuthenticationResponseOpts } from "@simplewebauthn/server";
import { LoginChallengeResponse, UserWithDevicesAndSessions } from "../types";
import { Request, Response } from "express";

const prisma = new PrismaClient();

export async function login(req: Request, res: Response) {
    try {

		// 1 check for challenge response
		// 2 check for rpId
		// 3 check for expected origin
		// 4 find user with challenge
		// 5 verify authentication response
		// 6 do stuff
		// 7 ?????

		const body = req.body;

		if (!req.body.loginChallengeResponse)
			throw Error("Login Challenge Response not present");
		const { challenge, credentials } =
			req.body.loginChallengeResponse as LoginChallengeResponse;

		if(!res.locals.payload) throw Error("Payload not present");
		const url = res.locals.payload.aud;
		const rpId = url.split(":")[0];	// remove port from rpId
		const rpName = "Wembat";
		const expectedOrigin = `https://${res.locals.payload.aud}`;
		const appUId = res.locals.payload.appUId;

		const user = (await prisma.user
			.findUnique({
				where: {
					challenge: challenge,
				},
				include: {
					devices: true,
					sessions: true
				},
			})
			.catch((err) => {
				console.log(err);
				throw Error("User with given challenge not found");
			})) as UserWithDevicesAndSessions;

		if (!user) throw Error("User with given challenge not found");

		let dbAuthenticator: any = null;
		const bodyCredIDBuffer = base64url.toBuffer(credentials.rawId);
		// "Query the DB" here for an authenticator matching `credentialID`
		for (const dev of user.devices) {
			if (dev.credentialId.equals(bodyCredIDBuffer)) {
				dbAuthenticator = dev;
				break;
			}
		}

		if (dbAuthenticator == null) {
			throw new Error(`Could not find authenticator matching ${body.id}`);
		}

		const opts: VerifyAuthenticationResponseOpts = {
			response: credentials,
			expectedChallenge: `${user.challenge}`,
			expectedOrigin,
			expectedRPID: rpId,
			authenticator: dbAuthenticator,
		};

		const { verified, authenticationInfo } = await verifyAuthenticationResponse(opts).catch(
			(err) => {
				console.log(err);
				throw Error("Authentication Response could not be verified");
			}
		);

		if (verified == false) throw Error("Could not verifiy reponse");

		// Update the authenticator's counter in the DB to the newest count in the authentication
		// TODO make this db call not only local parameter
		dbAuthenticator.counter = authenticationInfo.newCounter;

		// search in user sessions for session with app id
		// if there is already a session with the app id but not for this device id, return error
		// because we need to onboard the device to the session first
		const userSessionsForApp = user.sessions.filter((session) => session.appUId == appUId)
		const userSessionsForAppAndDevice = userSessionsForApp.filter((session) => session.deviceUId == dbAuthenticator.uid)

		let userSession: Session = null;
		
		if (userSessionsForApp.length == 0 && userSessionsForAppAndDevice.length == 0) {
			// create new user session for this app
			// keys will be generated locally
			userSession = await prisma.session
			.create({
				data: {
					userUId: user.uid,
					appUId: appUId,
					deviceUId: dbAuthenticator.uid,
				}
			})
			.catch((err) => {
				console.log(err);
				throw Error("Error while creating new session for user");
			}) as Session;
		} else if (userSessionsForApp.length > 0 && userSessionsForAppAndDevice.length == 0) {
			// user has sessions but device is not onboarded to session
			// keys need to be shared from other session
			throw Error("User device is not onboarded to session");
		} 
		else if (userSessionsForApp.length > 0 && userSessionsForAppAndDevice.length > 0) {
			// user has session for app and device
			userSession = userSessionsForAppAndDevice[0];
		} else {
			throw Error("Unknown error while creating session");
		}

		// create new json web token for api calls
		const jwt = await createSessionJWT(userSession, user, url);

		// add self generated jwt to whitelist
		await addToWebAuthnTokens(jwt);

		return res
			.status(200)
			.send(JSON.stringify({
				verified: verified,
				jwt: jwt,
				sessionId: userSession.uid,
				publicUserKey: userSession.publicKey,
				privateUserKeyEncrypted: userSession.privateKey,
				nonce: userSession.nonce
			}));
	} catch (error) {
		console.log(error);
		return res.status(400).send(error.message);
	}
}