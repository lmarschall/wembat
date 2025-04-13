import { generateAuthenticationOptions, GenerateAuthenticationOptionsOpts } from "@simplewebauthn/server";
import { UserInfo, UserWithDevicesAndSessions } from "../types";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

export async function requestLogin(req: Request, res: Response, prisma: PrismaClient) {
    try {

		// 1 check for user info
		// 2 check for rpId
		// 3 find user with mail
		// 4 generate authentication options
		// 5 update user challenge

		if (!req.body.userInfo) throw Error("User info not present");
		const { userMail } = req.body.userInfo as UserInfo;

		if (!res.locals.payload) throw Error("Payload not present");
		const audience = res.locals.payload.aud;
		const domain = audience.split("://")[1];
		const rpId = domain.split(":")[0];

		const user = (await prisma.user
			.findUnique({
				where: {
					mail: userMail,
				},
				include: {
					devices: true,
					sessions: true,
				},
			})
			.catch((err: any) => {
				console.log(err);
				throw Error("User could not be found in database");
			})) as UserWithDevicesAndSessions;

		if (user == null) throw Error("User could not be found in database");

		const opts: GenerateAuthenticationOptionsOpts = {
			timeout: 60000,
			allowCredentials: user.devices.map((dev: any) => ({
				id: dev.credentialId,
				transports: dev.transports as AuthenticatorTransport[],
			})),
			/**
			 * This optional value controls whether or not the authenticator needs be able to uniquely
			 * identify the user interacting with it (via built-in PIN pad, fingerprint scanner, etc...)
			 */
			userVerification: "preferred",
			rpID: rpId,
			extensions: {
				prf: {
					eval: {
						first: user.salt,
					},
				},
			} as any,
		};

		const options = await generateAuthenticationOptions(opts).catch(
			(err) => {
				console.log(err);
				throw Error("Authentication Options could not be generated");
			}
		);

		// update the user challenge
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
				throw Error("Updating user challenge failed");
			});

		res.status(200).send(
			JSON.stringify({ options: options })
		);
	} catch (error: any) {
		console.log(error);
		return res.status(400).send(error.message);
	}
}