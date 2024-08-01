import { randomBytes } from 'crypto'
import { PrismaClient, Prisma } from "@prisma/client";

import {
	generateRegistrationOptions,
	GenerateRegistrationOptionsOpts,
} from "@simplewebauthn/server";
import { Request, Response } from "express";
import { UserInfo } from '../types';

type UserWithDevices = Prisma.UserGetPayload<{
	include: { devices: true };
}>;

const prisma = new PrismaClient();

export async function requestRegister(req: Request, res: Response) {
    try {

		// 1 check for user info
		// 2 check for rpId
		// 3 check for rpName
		// 3 find user with mail
		// ?????
		// 4 generate registration options
		// 5 update user challenge

		if (!req.body.userInfo) throw Error("User info not present");
		const { userMail } = req.body.userInfo as UserInfo;

		if (!res.locals.rpId) throw Error("RP ID not present");
		const rpId = res.locals.rpId;

		if (!res.locals.rpName) throw Error("RP Name not present");
		const rpName = res.locals.rpName;

		// add logic with jwt token check if user has already registered devices

		const user = (await prisma.user
			.upsert({
				where: {
					mail: userMail,
				},
				update: {},
				create: {
					mail: userMail,
					salt: randomBytes(32),
				},
				include: {
					devices: true,
				},
			})
			.catch((err) => {
				console.log(err);
				throw Error("User could not be found or created in database");
			})) as UserWithDevices;

		const validToken = true;

		if (user.devices.length > 0 && !validToken) throw Error("User already registered with one device and no valid token provided for request")

		const opts: GenerateRegistrationOptionsOpts = {
			rpName: rpName,
			rpID: rpId,
			userID: user.uid,
			userName: user.mail,
			timeout: 60000,
			attestationType: "none",
			excludeCredentials: user.devices.map<PublicKeyCredentialDescriptor>((dev) => ({
				id: dev.credentialId,
				type: "public-key",
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
			.catch((err) => {
				console.log(err);
				throw Error("User challenge could not be updated");
			});

		res.status(200).send(JSON.stringify({ options: options }));
	} catch (error) {
		console.log(error);
		return res.status(400).send(error.message);
	}
}