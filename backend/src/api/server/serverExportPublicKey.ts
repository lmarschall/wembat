import { Request, Response } from "express";
import { cryptoService } from "../../crypto";

export async function serverExportPublicKey(req: Request, res: Response) {
    try {

        if (!cryptoService) {
            throw new Error("CryptoService not initialized");
        }

        const publicKey = await cryptoService.exportPublicKey();
        res.status(200).json(publicKey);

    } catch (err: any) {
        console.error(err);
        res.status(500).send(err.message);
    }
}