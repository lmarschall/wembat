import { PrismaClient } from "#prisma";
import { UserWithDevicesAndSessions } from "#api/types";
import { Request, Response } from "express";
import { cryptoService } from "#crypto";
import { configService } from "#config";
import { decodeProtectedHeader, importJWK, jwtVerify } from "jose";

export async function refresh(req: Request, res: Response, prisma: PrismaClient): Promise<void> {
    try {

        if (!req.cookies.refreshToken) throw Error("Refresh Token not present");
        const refreshToken = req.cookies.refreshToken;

        if(!res.locals.payload) throw Error("Payload not present");
		const expectedOrigin = res.locals.payload.aud;

        // Verify the refresh token itself instead of trusting client-supplied
        // userMail/sessionId values - otherwise anyone holding a valid app token
        // could mint a session for any user by guessing their mail/sessionId.
        const header = decodeProtectedHeader(refreshToken);

        if (header.alg == undefined || header.alg !== "ES256")
            throw Error("Invalid algorithm");

        const publicKeyJwk = await cryptoService.getPublicKeyJwk();

        if (header.jwk == undefined || JSON.stringify(header.jwk) !== JSON.stringify(publicKeyJwk))
            throw Error("Invalid public key");

        const importedKey = await importJWK(header.jwk, header.alg);
        const { payload } = await jwtVerify(refreshToken, importedKey, {
            issuer: configService.getServerUrl(),
            audience: expectedOrigin,
            algorithms: ["ES256"],
        }).catch((err: any) => {
            console.log(err);
            throw Error("Refresh token could not be verified");
        });

        const sessionId = payload.sessionId as string | undefined;
        const userMail = payload.userMail as string | undefined;

        if (!sessionId || !userMail) throw Error("Invalid refresh token payload");

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

        if (!user) throw Error("User could not be found in database");

        const userSession = user.sessions.find((session: any) => session.uid === sessionId);

        if (!userSession) throw Error("User session not found");

        const token = await cryptoService.createSessionToken(userSession, user, expectedOrigin);

        res.status(200).send(JSON.stringify({token: token}));
    } catch (error: any) {
        console.log(error);
		res.status(400).send(error.message);
    }
}