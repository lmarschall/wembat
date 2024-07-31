import base64url from "base64url";
import { UserWithDevices } from "../types";
import { verifyAuthenticationResponse, VerifyAuthenticationResponseOpts } from "@simplewebauthn/server";

export async function onboard(req: Request, res: Response) {
    // try {

	// 	// check for jwt token
	// 	// read user from jwt token
	// 	// get session for user
	// 	// update keys in session

	// 	// TODO put sessionid into token

	// 	if (!req.body.onboardRequest)
	// 		throw Error("Challenge Response not present");

	// 	const { privKey, pubKey, nonce, credentials, challenge } =
	// 		req.body.saveCredentialsRequest;

	// 	// find user with expected challenge
	// 	const user = (await prisma.user
	// 		.findUnique({
	// 			where: {
	// 				challenge: challenge,
	// 			},
	// 			include: {
	// 				devices: true,
	// 			},
	// 		})
	// 		.catch((err) => {
	// 			console.log(err);
	// 			throw Error("Could not find user for given challenge");
	// 		})) as UserWithDevices;

	// 	// user with challenge not found, return error
	// 	if (user == null) throw Error("Could not find user for given challenge");

	// 	let dbAuthenticator: any = null;
	// 	const bodyCredIDBuffer = base64url.toBuffer(credentials.rawId);
	// 	// "Query the DB" here for an authenticator matching `credentialID`
	// 	for (const dev of user.devices) {
	// 		if (dev.credentialId.equals(bodyCredIDBuffer)) {
	// 			dbAuthenticator = dev;
	// 			break;
	// 		}
	// 	}

	// 	if (dbAuthenticator == null) {
	// 		throw new Error(`Could not find authenticator matching`);
	// 	}
	
	// 	const opts: VerifyAuthenticationResponseOpts = {
	// 		response: credentials,
	// 		expectedChallenge: `${user.challenge}`,
	// 		expectedOrigin,
	// 		expectedRPID: rpId,
	// 		authenticator: dbAuthenticator,
	// 	};
	
	// 	const verification = await verifyAuthenticationResponse(opts).catch(
	// 		(err) => {
	// 			console.log(err);
	// 			throw Error("Authentication Response could not be verified");
	// 		}
	// 	);

	// 	const { verified, authenticationInfo } = verification;

	// 	if (!verified) throw Error("Not verified");

	// 	console.log('privKey');
	// 	console.log(privKey);
	// 	console.log('pubKey');
	// 	console.log(pubKey);
	// 	console.log('nonce');
	// 	console.log(nonce);
		
	// 	// update the user challenge
	// 	await prisma.session
	// 		.create({
	// 			data: {
	// 				userUId: user.uid,
	// 				appUId: appUId,
	// 				deviceUId: dbAuthenticator.uid,
	// 				publicKey: pubKey,
	// 				privateKey: privKey,
	// 				nonce: nonce
	// 			},
	// 		})
	// 		.catch((err) => {
	// 			console.log(err);
	// 			throw Error("Updating user challenge failed");
	// 		});

	// 	return res
	// 		.status(200)
	// 		.send(JSON.stringify({
	// 			success: true,
	// 		}));
	// } catch (error) {
	// 	console.log(error);
	// 	return res.status(400).send(error.message);
	// }
}