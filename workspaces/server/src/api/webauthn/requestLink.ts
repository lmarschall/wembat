import { PrismaClient, Prisma } from "@prisma/client";

import {
	generateRegistrationOptions,
	GenerateRegistrationOptionsOpts,
} from "@simplewebauthn/server";
import { isoUint8Array } from '@simplewebauthn/server/helpers';
import { Request, Response } from "express";

type UserWithDevices = Prisma.UserGetPayload<{
	include: { devices: true };
}>;

export async function requestLink(req: Request, res: Response, prisma: PrismaClient): Promise<void> {
    try {

		// 1 check for payload
		// 2 check for rpId
		// 3 find user with mail
		// ?????
		// 4 generate registration options
		// 5 update user challenge

		if(!res.locals.payload) throw Error("Payload not present");
		const audience = res.locals.payload.aud;
		const domain = audience.split("://")[1];
		const rpId = domain.split(":")[0];
		const rpName = "Wembat";
		const userMail = res.locals.payload.userMail;

		// add logic with jwt token check if user has already registered devices

		const user = (await prisma.user
			.findUnique({
				where: {
					mail: userMail,
				},
				include: {
					devices: true,
				},
			})
			.catch((err: any) => {
				console.log(err);
				throw Error("User could not be found or created in database");
			})) as UserWithDevices;

		
		if (user == null) throw Error("User could not be found in database");

		const opts: GenerateRegistrationOptionsOpts = {
			rpName: rpName,
			rpID: rpId,
			userID: isoUint8Array.fromUTF8String(user.uid),
			userName: user.mail,
			timeout: 60000,
			attestationType: "none",
			excludeCredentials: user.devices.map((dev: any) => ({
				id: dev.credentialId,
				transports: dev.transports as AuthenticatorTransport[],
			})),
			authenticatorSelection: {
				residentKey: "preferred",
				userVerification: "preferred",
			},
			supportedAlgorithmIDs: [-7, -257],
			extensions: {
				prf: {}
			} as any,
		}

		const options = await generateRegistrationOptions(opts).catch(
			(err) => {
				console.log(err);
				throw Error("Registration Option could not be generated");
			}
		);

		await prisma.user
			.update({
				where: {
					uid: user.uid,
				},
				data: {
					challenge: options.challenge,
				},
			})
			.catch((err: any) => {
				console.log(err);
				throw Error("User challenge could not be updated");
			});

		res.status(200).send(JSON.stringify({ options: options }));
	} catch (error: any) {
		console.log(error);
		res.status(400).send(error.message);
	}
}