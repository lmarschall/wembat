import { verifyRegistrationResponse, VerifyRegistrationResponseOpts } from "@simplewebauthn/server";
import { UserWithDevices } from "../types";

export async function register(req: Request, res: Response) {
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
}