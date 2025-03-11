import { PrismaClient } from "@prisma/client";
import { SessionInfo, UserInfo, UserWithDevicesAndSessions } from "../types";
import { Request, Response } from "express";
import { createSessionToken } from "../../crypto";

const prisma = new PrismaClient();

export async function refresh(req: Request, res: Response) {
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
			.catch((err) => {
				console.log(err);
				throw Error("User could not be found in database");
			})) as UserWithDevicesAndSessions;

        if (!user) throw Error("User could not be found in database");

        const userSession = user.sessions.find((session) => session.uid === sessionId);

        if (!userSession) throw Error("User session not found");

        const token = await createSessionToken(userSession, user, expectedOrigin);
        
        return res
			.status(200)
			.send(JSON.stringify({
				token: token
			}));
    } catch (error: any) {
        console.log(error);
		return res.status(400).send(error.message);
    }
}