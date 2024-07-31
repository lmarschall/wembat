import base64url from "base64url";
import { createJWT } from "../../crypto";
import { addToWebAuthnTokens } from "../../redis";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";

export async function login(req: Request, res: Response) {
    try {

		// 1 check for challenge response
		// 2 find user with challenge
		// 3 verify authentication response

		const body = req.body;

		if (!req.body.challengeResponse)
			throw Error("Challenge Response not present");

		const { challenge, credentials } =
			req.body.challengeResponse;

		// search for user by challenge
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

		const verification = await verifyAuthenticationResponse(opts).catch(
			(err) => {
				console.log(err);
				throw Error("Authentication Response could not be verified");
			}
		);

		const { verified, authenticationInfo } = verification;

		if (verified) {

			// Update the authenticator's counter in the DB to the newest count in the authentication
			// TODO make this db call not only local parameter
			dbAuthenticator.counter = authenticationInfo.newCounter;

			// search in user sessions for session with app id
			// if there is already a session with the app id but not for this device id, return error
			// because we need to onboard the device to the session first
			const userSessionsForApp = user.sessions.filter((session) => session.appUId == appUId)
			const userSessionsForAppAndDevice = userSessionsForApp.filter((session) => session.deviceUId == dbAuthenticator.uid)

			let userSession = null;

			// user has sessions but device is not onboarded
			if (userSessionsForApp.length > 0 && userSessionsForAppAndDevice.length == 0) {
				throw Error("User device is not onboarded to session");
			} else {
				userSession = userSessionsForAppAndDevice[0];
			}

			if (userSession == null) {
				userSession = await prisma.session
				.create({
					data: {
						userUId: user.uid,
						appUId: appUId,
						deviceUId: dbAuthenticator.uid,
					},
				})
				.catch((err) => {
					console.log(err);
					throw Error("Error while creating new session for user");
				}) as Session;
			}

			// create new json web token for api calls
			const jwt = await createJWT(user);

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
		} else {
			throw Error("Could not verifiy reponse");
		}
	} catch (error) {
		console.log(error);
		return res.status(400).send(error.message);
	}
}