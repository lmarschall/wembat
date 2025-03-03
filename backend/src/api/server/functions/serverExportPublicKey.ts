import { Request, Response } from "express";
import { exportPublicKey } from "../../../crypto";

export async function serverExportPublicKey(req: Request, res: Response) {
    try {

        const publicKey = await exportPublicKey();
        res.json(publicKey);

    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
}