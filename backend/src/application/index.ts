import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { Application, PrismaClient, User } from "@prisma/client";
import { createApplicationJWT } from "../crypto";

const prisma = new PrismaClient();

export const applicationTokens = new Map<string, string>();

const apps = process.env.APP_URLS || "localhost:3000, localhost:3001, localhost:3002";

export async function initApplications() {

    const urls = apps.split(",").map((url) => url.trim());
    console.log(`Registering applications: ${urls}`);

    for (const url of urls) {
        const app = await prisma.application
            .upsert({
                where: {
                    url: url,
                },
                update: {
                },
                create: {
                    url: url,
                    name: url,
                },
            })
            .catch((err) => {
                console.log(err);
                throw Error("App Create/Find failed");
            });

        const token = await createApplicationJWT(app);
        applicationTokens.set(app.url, token);
        console.log(`Application ${app.url} registered with token ${token}`);
    }
}