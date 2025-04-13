import { verifyRegistrationResponse, VerifyRegistrationResponseOpts } from "@simplewebauthn/server";
import { linkChallengeResponse, RegisterChallengeResponse, UserWithDevices } from "../types";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

export async function link(req: Request, res: Response, prisma: PrismaClient): Promise<void> {
    try {

		// 1 check for register challenge response
		// 2 check for rpId
		// 3 check for expected origin
		// 4 find user with challenge
		// 5 verify registration response
		// 6 create or update device for verified user

		if (!req.body.linkChallengeResponse)
			throw Error("Link Challenge Response not present");
		const { challenge, credentials } =
			req.body.linkChallengeResponse as linkChallengeResponse;

		if(!res.locals.payload) throw Error("Payload not present");
		const audience = res.locals.payload.aud;
		const domain = audience.split("://")[1];
		const rpId = domain.split(":")[0];
		const expectedOrigin = res.locals.payload.aud;

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
		await prisma.device
			.upsert({
				where: {
					credentialId: registrationInfo.credential.id,
				},
				update: {
					userUId: user.uid,
					counter: registrationInfo.credential.counter,
				},
				create: {
					userUId: user.uid,
					credentialPublicKey: Buffer.from(registrationInfo.credential.publicKey),
					credentialId: registrationInfo.credential.id,
					counter: registrationInfo.credential.counter,
					transports: credentials.response.transports,
				},
			})
			.catch((err: any) => {
				console.log(err);
				throw Error("Device Regitration update or create failed");
			});

		res.status(200).send(JSON.stringify({ verified: verified }));
	} catch (error: any) {
		console.log(error);
		res.status(400).send(error.message);
	}
}