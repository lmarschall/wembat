import { generateAuthenticationOptions, GenerateAuthenticationOptionsOpts } from "@simplewebauthn/server";
import { UserInfo, UserWithDevices } from "../types";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function requestOnboard(req: Request, res: Response) {
    try {

		// 1 check for user info
		// 2 find user with name
		// 3 generate authentication options
		// 4 update user challenge

		if (!req.body.userInfo) throw Error("User info not present");
		const { userMail } = req.body.userInfo as UserInfo;

		if (!res.locals.rpId) throw Error("RP ID not present");
		const rpId = res.locals.rpId;

		// search for user
		const user = (await prisma.user
			.findUnique({
				where: {
					mail: userMail,
				},
				include: {
					devices: true,
				},
			})
			.catch((err) => {
				console.log(err);
				throw Error("User could not be found in database");
			})) as UserWithDevices;

		if (user == null) throw Error("User could not be found in database");

		const opts: GenerateAuthenticationOptionsOpts = {
			timeout: 60000,
			allowCredentials: user.devices.map<PublicKeyCredentialDescriptor>((dev) => ({
				id: dev.credentialId,
				type: "public-key",
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

		console.log(opts)

		const options = await generateAuthenticationOptions(opts).catch(
			(err) => {
				console.log(err);
				throw Error("Authentication Options could not be generated");
			}
		);

		console.log(options);

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
			.catch((err) => {
				console.log(err);
				throw Error("Updating user challenge failed");
			});

		res.send(
			JSON.stringify({ options: options })
		);
	} catch (error) {
		console.log(error);
		return res.status(400).send(error.message);
	} 
}