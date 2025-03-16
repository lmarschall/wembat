import { Request, Response } from "express";
import { cryptoService } from "../../crypto";

export async function serverExportPublicKey(req: Request, res: Response) {
    try {

        const publicKey = await cryptoService.exportPublicKey();
        res.status(200).json(publicKey);

    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
}