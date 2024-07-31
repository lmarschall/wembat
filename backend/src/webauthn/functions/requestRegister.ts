import { request } from "http";
import { randomBytes } from 'crypto'
import { PrismaClient, User, Prisma, Session, Device } from "@prisma/client";

import {
	// Registration
	generateRegistrationOptions,
	verifyRegistrationResponse,
	GenerateRegistrationOptionsOpts,
	// Authentication
	generateAuthenticationOptions,
	verifyAuthenticationResponse,
	GenerateAuthenticationOptionsOpts,
	VerifyAuthenticationResponseOpts,
	VerifyRegistrationResponseOpts,
} from "@simplewebauthn/server";

type UserWithDevices = Prisma.UserGetPayload<{
	include: { devices: true };
}>;

const prisma = new PrismaClient();

export async function requestRegister(req: Request, res: Response) {
    try {

		if (!req.body.userInfo) throw Error("User Info not present");

		const { userMail } = req.body.userInfo;

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
			userName: user.name,
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