import base64url from "base64url";
import { UserWithDevices } from "../types";
import { verifyAuthenticationResponse, VerifyAuthenticationResponseOpts } from "@simplewebauthn/server";
import { Device, PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

export async function onboard(req: Request, res: Response, prisma: PrismaClient): Promise<void> {
    try {

		// check for jwt token
		// read user from jwt token
		// get session for user
		// update keys in session

		// TODO put sessionid into token

		if (!req.body.onboardRequest)
			throw Error("Challenge Response not present");

		const { privateKey, publicKey, nonce, credentials, challenge } =
			req.body.onboardRequest;

		if(!res.locals.payload) throw Error("Payload not present");
		const audience = res.locals.payload.aud;
		const domain = audience.split("://")[1];
		const rpId = domain.split(":")[0];
		const expectedOrigin = res.locals.payload.aud;

		const app = await prisma.application
			.findUnique({
				where: {
					domain: domain,
				},
			})

		if (app == undefined) throw Error("Application not found");

		const appUId = app.uid;

		// find user with expected challenge
		const user = (await prisma.user
			.findUnique({
				where: {
					challenge: challenge,
				},
				include: {
					devices: true,
				},
			})
			.catch((err: any) => {
				console.log(err);
				throw Error("Could not find user for given challenge");
			})) as UserWithDevices;

		// user with challenge not found, return error
		if (user == null) throw Error("Could not find user for given challenge");

		let userDevice: Device | null = null;
		// "Query the DB" here for an authenticator matching `credentialID`
		for (const dev of user.devices) {
			if (dev.credentialId === credentials.rawId) {
				userDevice = dev;
				break;
			}
		}

		if (userDevice == null) {
			throw new Error(`Could not find authenticator matching`);
		}
	
		const opts: VerifyAuthenticationResponseOpts = {
			response: credentials,
			expectedChallenge: `${user.challenge}`,
			expectedOrigin,
			expectedRPID: rpId,
			requireUserVerification: false,
			credential: {
				id: userDevice.uid,
				publicKey: userDevice.credentialPublicKey,
				counter: userDevice.counter,
				transports: userDevice.transports as any[]
			}
		};
	
		const verification = await verifyAuthenticationResponse(opts).catch(
			(err) => {
				console.log(err);
				throw Error("Authentication Response could not be verified");
			}
		);

		const { verified, authenticationInfo } = verification;

		if (!verified) throw Error("Not verified");
		
		// update the user challenge
		await prisma.session
			.create({
				data: {
					userUId: user.uid,
					appUId: appUId,
					deviceUId: userDevice.uid,
					publicKey: publicKey,
					privateKey: privateKey,
					nonce: nonce
				},
			})
			.catch((err: any) => {
				console.log(err);
				throw Error("Updating user challenge failed");
			});

		res.status(200).send(JSON.stringify({success: true}));
	} catch (error: any) {
		console.log(error);
		res.status(400).send(error.message);
	}
}