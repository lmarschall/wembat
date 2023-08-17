
import { Router } from 'express';
import { Application, PrismaClient, Claim } from '@prisma/client';
import { validateWebAuthnToken } from '../webauthn/validate';
import { checkRedisCache, addToRedisCache } from '../redis';

export const router = Router();
const prisma = new PrismaClient();

router.get("/fetch", checkRedisCache, async (req, res) => {
    
    // return all applications for now
    await prisma.application.findMany({
        include: {
            reports: false
        }
    }).then((apps: Application[]) => {
        if(!apps) return res.status(400).send();
        // save apps in redis cache
        addToRedisCache(req.originalUrl, JSON.stringify(apps));
        return res.send(apps);
    }).catch((err) => {
        console.log(err);
        return res.status(400).send();
    })
});

router.get("/find", async (req, res) => {

    // check if uid is provided and return unique application
    if (req.query.applicationUId) {
        await prisma.application.findUnique({
            where: {
                uid: req.query.applicationUId as string
            },
        }).then((app: Application) => {
            if(!app) return res.status(400).send();
            return res.send(app);
        }).catch((err) => {
            console.log(err);
            return res.status(400).send();
        })
    } else {
        return res.status(400).send("ERROR MESSAGE");
    }
});

router.get("/user", validateWebAuthnToken, async (req, res) => {
    
    // check if user id was provided
    if(!res.locals.payload.userId) return res.status(400).send();

    const userId = res.locals.payload.userId

    // get all user claims
    await prisma.claim.findMany({
        where: {
            userUId: userId
        },
        include: {
            app: true
        }
    }).then((claims: Claim[]) => {
        if(!claims) return res.status(400).send();
        return res.send(claims);
    }).catch((err) => {
        console.log(err);
        return res.status(400).send();
    })
});

router.post("/create", validateWebAuthnToken, async (req, res) => {

    // check if the url meets the regex rules
    // https://www.pinterest.de/

    // check if app url was provided
    if(!req.body.appUrl) return res.status(400).send();

    // check if user id was provided
    if(!res.locals.payload.userId) return res.status(400).send();

    const userId: string = res.locals.payload.userId

    // get url from request body
    const appUrl = req.body.appUrl as string;

    // check if url matches the required pattern
    if(appUrl.match(/^(https:\/\/?([a-z0-9]+[.])?([a-z]+[.])([a-z]))/igm) == null) return res.status(400).send();

    // get app if url was already provided or create new one
    const app = await prisma.application.upsert({
        where: { url: appUrl },
        update: { },
        create: { url: appUrl, name: "Submitted Application" }
    }).catch((err) => {
        console.log(err);
        return res.status(400).send();
    }) as Application

    // create new claim for app
    await prisma.claim.create({
        data: {
            url: appUrl,
            appUId: app.uid,
            userUId: userId
        },
    }).then((claim: Claim) => {
        if(!claim) return res.status(400).send();
        return res.send(claim);
    }).catch((err) => {
        console.log(err);
        return res.status(400).send();
    })
});