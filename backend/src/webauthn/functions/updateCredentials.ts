import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient();

export async function updateCredentials(req: Request, res: Response) {
    try {

		// check for jwt token
		// read user from jwt token
		// get session for user
		// update keys in session

		// TODO put sessionid into token

		if (!req.body.updateCredentialsRequest)
			throw Error("Challenge Response not present");

		const { privKey, pubKey, nonce, sessionId } =
			req.body.updateCredentialsRequest;
		
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
}