import { PrismaClient } from "@prisma/client";
import { SessionInfo, UserWithDevicesAndSessions } from "../types";
import { Request, Response } from "express";
import { cryptoService } from "../../crypto";

export async function refresh(req: Request, res: Response, prisma: PrismaClient): Promise<void> {
    try {

        if (!req.cookies.refreshToken) throw Error("Refresh Token not present");
        const refreshToken = req.cookies.refreshToken;

        if (!req.body.userInfo) throw Error("User info not present");
		const { userMail, sessionId } = req.body.userInfo as SessionInfo;

        if(!res.locals.payload) throw Error("Payload not present");
		const expectedOrigin = res.locals.payload.aud;

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