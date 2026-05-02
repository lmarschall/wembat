import { verifyRegistrationResponse, VerifyRegistrationResponseOpts } from "@simplewebauthn/server";
import { RegisterChallengeResponse, UserWithDevices, UserWithDevicesAndSessions } from "#api/types";
import { Request, Response } from "express";
import { PrismaClient, Session } from "#prisma";
import { redisService } from "#redis";
import { cryptoService } from "#crypto";

export async function register(req: Request, res: Response, prisma: PrismaClient): Promise<void> {
    try {

		// 1 check for register challenge response
		// 2 check for rpId
		// 3 check for expected origin
		// 4 find user with challenge
		// 5 verify registration response
		// 6 create or update device for verified user

		if (!req.body.registerChallengeResponse)
			throw Error("Register Challenge Response not present");
		const { challenge, credentials, privateKey, publicKey, cipherBlob } =
			req.body.registerChallengeResponse as RegisterChallengeResponse;

		if(!res.locals.payload) throw Error("Payload not present");
		const audience = res.locals.payload.aud;
		const domain = audience.split("://")[1];
		const rpId = domain.split(":")[0];
		const expectedOrigin = res.locals.payload.aud;
		const appUId = res.locals.payload.appUId;

		// find user with expected challenge
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
			.catch((err: any) => {
				console.log(err);
				throw Error("Could not find user for given challenge");
			})) as UserWithDevicesAndSessions;

		// user with challenge not found, return error
		if (user == null) throw Error("Could not find user for given challenge");

		const opts: VerifyRegistrationResponseOpts = {
			response: credentials,
			expectedChallenge: `${user.challenge}`,
			expectedOrigin,
			expectedRPID: rpId,
			requireUserVerification: false,
		};

		const { verified, registrationInfo } = await verifyRegistrationResponse(opts).catch(
			(err) => {
				console.log(err);
				throw Error("Registration Response could not be verified");
			}
		);

		if (verified == false) throw Error("Could not verifiy reponse");

		if (registrationInfo == null) throw Error("Registration Info not present");

		// check if device is already registered with user, else create device registration for user
		const userDevice = await prisma.device
			.create({
				data: {
					userUId: user.uid,
					credentialPublicKey: Buffer.from(registrationInfo.credential.publicKey),
					credentialId: registrationInfo.credential.id,
					counter: registrationInfo.credential.counter,
					transports: credentials.response.transports,
				}
			})
			.catch((err: any) => {
				console.log(err);
				throw Error("Device Regitration update or create failed");
			});

		const userSession = await prisma.session
			.create({
				data: {
					userUId: user.uid,
					appUId: appUId,
					deviceUId: userDevice.uid,
					privateKey: privateKey,
					publicKey: publicKey,
					cipherBlob: cipherBlob
				}
			})
			.catch((err: any) => {
				console.log(err);
				throw new Error("Error while creating new session for user");
			});

		// On register we should only create a new device and a new session
		// Else "onboarding" or "linking" is required

		// create new json web token for api calls
		const token = await cryptoService.createSessionToken(userSession, user, expectedOrigin);
		const refreshToken = await cryptoService.createSessionRefreshToken(userSession, user, expectedOrigin);

		// add self generated jwt to whitelist
		await redisService.addToWebAuthnTokens(token);

		res
			.status(200)
			.cookie('refreshToken', refreshToken, {
				httpOnly: true,        // Prevents JavaScript access to the cookie
				secure: true,          // Ensures the cookie is only sent over HTTPS
				// sameSite: 'Strict',    // Helps prevent CSRF
				sameSite: 'none',
				path: '/',
				maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
			})
			.send(JSON.stringify({
				verified: verified,
				token: token,
				sessionId: userSession.uid																	
			}));

		// res.status(200).send(JSON.stringify({ verified: verified }));
	} catch (error: any) {
		console.log(error);
		res.status(400).send(error.message);
	}
}