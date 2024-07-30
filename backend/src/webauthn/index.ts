import { Router } from "express";
import base64url from "base64url";
import { randomBytes } from 'crypto'
import { addToWebAuthnTokens } from "../redis";
import { createJWT } from "../crypto";
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

type UserWithDevicesAndSessions = Prisma.UserGetPayload<{
	include: { devices: true, sessions: true };
}>;

interface ExtensionsLargeBlobSupport extends AuthenticationExtensionsClientInputs {
	largeBlob: {
		support: string;
	};
}

interface ExtensionsLargeBlobWrite extends AuthenticationExtensionsClientInputs {
	largeBlob: {
		write: Uint8Array;
	};
}

interface ExtensionsLargeBlobRead extends AuthenticationExtensionsClientInputs {
	largeBlob: {
		read: boolean,
	};
}

export const webauthnRoutes = Router();
const prisma = new PrismaClient();
const rpId = process.env.RPID || "localhost:3000";
const rpName = "Wembat";
const expectedOrigin = `https://${rpId}:3000`;
const appUId = "clz2v6xdh0140uctnqfg0edlv";

console.log("server is starting webauthn services");

webauthnRoutes.post("/request-register", async (req, res) => {
	try {

		// 1 check for user info
		// 2 check if user exists
		// 3 create user if not exists
		// 3 check if user has already registered devices
		// 4 return error if user has already registered devices
		// 5 generate registration options
		// 6 update user challenge

		if (!req.body.userInfo) throw Error("User Info not present");

		const { userName } = req.body.userInfo;

		// add logic with jwt token check if user has already registered devices

		const user = (await prisma.user
			.upsert({
				where: {
					name: userName,
				},
				update: {},
				create: {
					name: userName,
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
});

// TODO add onboard endpoint

webauthnRoutes.post("/request-onboard", async (req, res) => {
	try {

		// 1 check for user info
		// 2 find user with name
		// 3 generate authentication options
		// 4 update user challenge

		if (!req.body.userInfo) throw Error("User info not present");

		const { userName } = req.body.userInfo;

		const firstSalt = new Uint8Array(new Array(32).fill(1)).buffer;

		// search for user
		const user = (await prisma.user
			.findUnique({
				where: {
					name: userName,
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

		res.status(200).send(
			JSON.stringify({ options: options })
		);
	} catch (error) {
		console.log(error);
		return res.status(400).send(error.message);
	}
});

webauthnRoutes.post("/onboard", async (req, res) => {
	try {

		// check for jwt token
		// read user from jwt token
		// get session for user
		// update keys in session

		// TODO put sessionid into token

		if (!req.body.onboardRequest)
			throw Error("Challenge Response not present");

		const { privKey, pubKey, nonce, credentials, challenge } =
			req.body.saveCredentialsRequest;

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
			throw new Error(`Could not find authenticator matching`);
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

		if (!verified) throw Error("Not verified");

		console.log('privKey');
		console.log(privKey);
		console.log('pubKey');
		console.log(pubKey);
		console.log('nonce');
		console.log(nonce);
		
		// update the user challenge
		await prisma.session
			.create({
				data: {
					userUId: user.uid,
					appUId: appUId,
					deviceUId: dbAuthenticator.uid,
					publicKey: pubKey,
					privateKey: privKey,
					nonce: nonce
				},
			})
			.catch((err) => {
				console.log(err);
				throw Error("Updating user challenge failed");
			});

		return res
			.status(200)
			.send(JSON.stringify({
				success: true,
			}));
	} catch (error) {
		console.log(error);
		return res.status(400).send(error.message);
	}
});

webauthnRoutes.post("/register", async (req, res) => {
	try {

		// 1 check for challenge response
		// 2 find user with challenge
		// 3 check if user with challenge exists
		// 4 verify registration response
		// 5 create device for verified user

		if (!req.body.challengeResponse)
			throw Error("Challenge Response not present");

		// get the signed credentials and the expected challenge from request
		const { challenge, credentials } =
			req.body.challengeResponse;

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

		const verification = await verifyRegistrationResponse(opts).catch(
			(err) => {
				console.log(err);
				throw Error("Registration Response could not be verified");
			}
		);

		const { verified, registrationInfo } = verification;

		if (verified && registrationInfo) {
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
		}

		res.status(200).send(JSON.stringify({ verified: verified }));
	} catch (error) {
		console.log(error);
		return res.status(400).send(error.message);
	}
});

webauthnRoutes.post("/request-login", async (req, res) => {
	try {

		// 1 check for user info
		// 2 find user with name
		// 3 generate authentication options
		// 4 update user challenge

		if (!req.body.userInfo) throw Error("User info not present");

		const { userName } = req.body.userInfo;

		const firstSalt = new Uint8Array(new Array(32).fill(1)).buffer;

		// search for user
		const user = (await prisma.user
			.findUnique({
				where: {
					name: userName,
				},
				include: {
					devices: true,
					sessions: true,
				},
			})
			.catch((err) => {
				console.log(err);
				throw Error("User could not be found in database");
			})) as UserWithDevicesAndSessions;

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

		res.status(200).send(
			JSON.stringify({ options: options })
		);
	} catch (error) {
		console.log(error);
		return res.status(400).send(error.message);
	}
});

webauthnRoutes.post("/login", async (req, res) => {
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
});

webauthnRoutes.post("/update-credentials", async (req, res) => {
	try {

		// check for jwt token
		// read user from jwt token
		// get session for user
		// update keys in session

		// TODO put sessionid into token

		if (!req.body.saveCredentialsRequest)
			throw Error("Challenge Response not present");

		const { privKey, pubKey, nonce, sessionId } =
			req.body.updateCredentialsRequest;

		console.log('privKey');
		console.log(privKey);
		console.log('pubKey');
		console.log(pubKey);
		console.log('nonce');
		console.log(nonce);
		
		// update the user challenge
		await prisma.session
			.update({
				where: {
					uid: sessionId
				},
				data: {
					publicKey: pubKey,
					privateKey: privKey,
					nonce: nonce
				},
			})
			.catch((err) => {
				console.log(err);
				throw Error("Updating user challenge failed");
			});

		return res
			.status(200)
			.send(JSON.stringify({
				success: true,
			}));
	} catch (error) {
		console.log(error);
		return res.status(400).send(error.message);
	}
});