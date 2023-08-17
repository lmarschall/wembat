
import { Router } from 'express';
import { PrismaClient, Report, Application, Claim, ReportStatus } from '@prisma/client';
import { validateServiceToken } from '../serviceauthn/validate';
import { validateWebAuthnToken } from '../webauthn/validate';
import { checkRedisCache, resetRedisCache } from '../redis';

export const router = Router();
const prisma = new PrismaClient();

router.get("/find", async (req, res) => {

    // if reportUId was given, return unique report
    if(req.query.reportUId) {
        await prisma.report.findUnique({
            where: {
                uid: req.query.reportUId as string
            },
        }).catch((err) => {
            console.log(err);
            return res.status(400).send();
        }).then((report: Report) => {
            return res.send(report)
        })
    }

    // if applicationUId was given, return all reports for application
    if(req.query.applicationUId) {
        await prisma.report.findMany({
            where: {
                appUId: req.query.applicationUId as string
            },
        }).catch((err) => {
            console.log(err);
            return res.status(400).send();
        }).then((reports: Report[]) => {
            return res.send(reports)
        })
    } else {
        return res.status(400).send();
    }
});

router.get("/handle", validateServiceToken, async (req, res) => {

    // find report which needs handling
    const findReport = await prisma.report.findFirst({
        where: {
            status: ReportStatus.Created,
        },
    }).catch((err) => {
        console.log(err);
        return res.status(400).send();
    }) as Report

    // if no report was found, return error
    if(findReport == null) return res.status(400).send();

    // update the report to handle status
    await prisma.report.update({
        where: {
            uid: findReport.uid,
        },
        data: {
            status: ReportStatus.Handled,
        },
        include: {
            app: true
        }
    }).catch((err) => {
        console.log(err);
        return res.status(400).send();
    }).then((report: any) => {
        return res.send(report);
    })
});

// request new report for application
router.get("/request", validateWebAuthnToken, async (req, res) => {

    // check if appUId was provided
    if(!req.query.applicationUId) return res.status(400).send();

    // check if userUId was provided
    if(!res.locals.payload.userId) return res.status(400).send();
    const userId: string = res.locals.payload.userId

    // search for app with given uid
    const app = await prisma.application.findUnique({
        where: {
            uid: req.query.applicationUId as string
        },
    }).catch((err) => {
        console.log(err);
        return res.status(400).send();
    }) as Application

    // search for user claims
    const claims = await prisma.claim.findMany({
        where: {
            userUId: userId
        },
    }).catch((err) => {
        console.log(err);
        return res.status(400).send();
    }) as Claim[]
    
    // check if app and claims are found
    if(!app || !claims) return res.status(400).send();
    
    // check if request is valid, not valid if token not empty and user not owner
    const tokens = claims.map(a => a.token);
    if(!(app.token == "") && !(tokens.includes(app.token))) return res.status(400).send();

    // create new report for app
    await prisma.report.create({
        data: {
            appUId: app.uid
        },
    }).catch((err) => {
        console.log(err);
        return res.status(400).send();
    }).then((report: any) => {
        return res.send(report)
    })
});

router.post("/finish", validateServiceToken, async (req, res) => {

    // check if correct parameters were provided
    if(!req.query.reportUId || !req.body.reportResults || !req.body.manifestData) return res.status(400).send();

    // update the report with given data
    const report = await prisma.report.update({
        where: {
            uid: req.query.reportUId as string
        },
        data: {
            html: req.body.reportResults.reportHtml,
            score: req.body.reportResults.reportScore,
            date: req.body.reportResults.reportDate,
            status: ReportStatus.Finished
        }
    }).catch((err) => {
        console.log(err);
        return res.status(400).send();
    }) as Report

    let pwahubToken = "";

    // check for new owner of app
    if(req.body.manifestData.fetchedToken) {

        pwahubToken = req.body.manifestData.fetchedToken as string

        const claim = await prisma.claim.findUnique({
            where: {
                token: pwahubToken
            },
        }).catch((err) => {
            console.log(err);
            return res.status(400).send();
        }) as Claim

        // if no claim was found, reset token
        if(!claim) {
            pwahubToken = "";
        }
    }

    // reset application cache to get updated applications
    await resetRedisCache('/application/fetch');

    // update app with fetched manifest data
    await prisma.application.update({
        where: {
            uid: report.appUId,
        },
        data: {
            name: req.body.manifestData.fetchedName,
            description: req.body.manifestData.fetchedDescription,
            icon: req.body.manifestData.fetchedIcon,
            token: pwahubToken,
            categories: req.body.manifestData.fetchedCategories,
            screenshots: req.body.manifestData.fetchedScreenshots
        }
    }).catch((err) => {
        console.log(err);
        return res.status(400).send();
    }).then(() => {
        return res.status(200).send();
    })
});