import { Router } from 'express';
import { Client, PrismaClient } from '@prisma/client';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { addToServiceTokens } from './../redis';

export const router = Router();
const prisma = new PrismaClient();

router.post('/request-token', async (req, res) => {

    // check if clientInfos are provided
    if(!req.body.clientInfo.clientUId || !req.body.clientInfo.clientSecret) return res.status(400).send();

    // get parameters from request
    const { clientUId, clientSecret } = req.body.clientInfo;

    // search the client with the given uid
    const client = await prisma.client.findUnique({
        where: {
            uid: clientUId,
        },
    }).catch((err) => {
        console.log(err);
        return res.status(400).send();
    }) as Client

    if(!client) return res.status(400).send();

    // check if the given secret matches
    if(clientSecret === client.secret) {

        // create key pair for signing and verifying json web token
        const { publicKey, privateKey } = await generateKeyPair('ES256')

        // generate jwk from public to include into token header
        const publicJwk = await exportJWK(publicKey)

        // create new json web token for api calls
        const jwt = await new SignJWT({ 'urn:example:claim': true })
            .setProtectedHeader({ alg: 'ES256', jwk: publicJwk })
            .setIssuedAt()
            .setIssuer('urn:example:issuer')
            .setAudience('urn:example:audience')
            // .setExpirationTime('2h') // no exp time
            .sign(privateKey)

        // add jwt to service authn whitelist
        await addToServiceTokens(jwt);

        return res.send(jwt)
    } else {
        return res.status(400).send();
    }
});