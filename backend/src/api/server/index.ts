import { Router } from "express";
import { validateAppFunctions } from "../validate";
import { serverExportPublicKey } from "./functions/serverExportPublicKey";

export const serverRoutes = Router();

serverRoutes.get(
    "/publicKey",
    validateAppFunctions,
    async (req, res) => serverExportPublicKey(req, res)
);

export async function initServer(): Promise<boolean> {
    try {
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
}