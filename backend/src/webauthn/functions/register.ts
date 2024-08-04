import { verifyRegistrationResponse, VerifyRegistrationResponseOpts } from "@simplewebauthn/server";
import { RegisterChallengeResponse, UserWithDevices } from "../types";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function register(req: Request, res: Response) {
    try {

		// 1 check for register challenge response
		// 2 check for rpId
		// 3 check for expected origin
		// 4 find user with challenge
		// 5 verify registration response
		// 6 create or update device for verified user

		if (!req.body.registerChallengeResponse)
			throw Error("Register Challenge Response not present");
		const { challenge, credentials } =
			req.body.registerChallengeResponse as RegisterChallengeResponse;

		if(!res.locals.payload) throw Error("Payload not present");
		const rpId = res.locals.payload.aud.split(":")[0];	// remove port from rpId
		const rpName = "Wembat";
		const expectedOrigin = `https://${res.locals.payload.aud}`;
		const appUId = res.locals.payload.appUId;

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
			.catch((err) => {
				console.log(err);
				throw Error("Could not find user for given challenge");
			})) as UserWithDevices;

		// user with challenge not found, return error
		if (user == null) throw Error("Could not find user for given challenge");

		const opts: VerifyRegistrationResponseOpts = {
			response: credentials,
			expectedChallenge: `${user.challenge}`,
			expectedOrigin,
			expectedRPID: rpId,
		};

		const { verified, registrationInfo } = await verifyRegistrationResponse(opts).catch(
			(err) => {
				console.log(err);
				throw Error("Registration Response could not be verified");
			}
		);

		if (verified == false) throw Error("Could not verifiy reponse");
		
		const { credentialPublicKey, credentialID, counter } =
			registrationInfo;

		// check if device is already registered with user, else create device registration for user
		await prisma.device
			.upsert({
				where: {
					credentialId: Buffer.from(credentialID),
				},
				update: {
					userUId: user.uid,
					counter: counter,
				},
				create: {
					userUId: user.uid,
					credentialPublicKey: Buffer.from(credentialPublicKey),
					credentialId: Buffer.from(credentialID),
					counter: counter,
					transports: credentials.response.transports,
				},
			})
			.catch((err) => {
				console.log(err);
				throw Error("Device Regitration update or create failed");
			});

		res.status(200).send(JSON.stringify({ verified: verified }));
	} catch (error) {
		console.log(error);
		return res.status(400).send(error.message);
	}
}