import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { UserWithDevices } from "../types";

export async function deviceList(req: Request, res: Response, prisma: PrismaClient) {
    try {

        if(!res.locals.payload) throw Error("Payload not present");
		const userMail = res.locals.payload.userMail;

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

        res.status(200).json(user.devices);

    } catch (err: any) {
        console.error(err);
        res.status(500).send(err.message);
    }
}