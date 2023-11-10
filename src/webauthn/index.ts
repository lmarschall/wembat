import { Router} from 'express';
import base64url from 'base64url';
import { addToWebAuthnTokens } from './../redis';
import { PrismaClient, User, Prisma } from '@prisma/client';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';

type UserWithDevices = Prisma.UserGetPayload<{
    include: { devices: true }
}>

const {
    // Registration
    generateRegistrationOptions,
    verifyRegistrationResponse,
    // Authentication
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

export const router = Router();
const prisma = new PrismaClient();
const rpId = process.env.RPID || "pwahub.one";
const rpName = "PWAHUB";
const expectedOrigin = `https://${rpId}:3000`;

console.log('server is starting webauthn services')

router.post('/request-register', async (req, res) => {

    if(!req.body.userInfo) return res.status(400).send();

    // get parameters from request
    const { userMail } = req.body.userInfo;

    // search for user if name already exists, else generate new user
    const user = await prisma.user.upsert({
        where: {
            mail: userMail,
        },
        update: {
        },
        create: {
            mail: userMail
        },
        include: {
            devices: true
        }
    }).catch((err: any) => {
        console.log(err);
        return res.status(400).send();
    }) as UserWithDevices

    const opts = {
        rpName: rpName,
        rpId,
        userID: user.uid,
        userName: userMail,
        timeout: 60000,
        attestationType: 'direct',
        /**
         * Passing in a user's list of already-registered authenticator IDs here prevents users from
         * registering the same device multiple times. The authenticator will simply throw an error in
         * the browser if it's asked to perform registration when one of these ID's already resides
         * on it.
         */
        excludeCredentials: user.devices.map(dev => ({
          id: dev.credentialId,
          type: 'public-key',
          transports: dev.transports || ['usb', 'ble', 'nfc', 'internal'],
        })),
        /**
         * The optional authenticatorSelection property allows for specifying more constraints around
         * the types of authenticators that users to can use for registration
         */
        // authenticatorSelection: {
        //   userVerification: 'preferred',
        //   requireResidentKey: false,
        // },
        extensions: {
            largeBlob: {
                support: "required"
            }
        },
        supportedAlgorithmIDs: [-7, -257]
    };

    const options = await generateRegistrationOptions(opts);

    console.log("update user challenge");

    // update the user challenge
    await prisma.user.update({
        where: {
            uid: user.uid
        },
        data: {
            challenge: options.challenge,
        }
    }).catch((err: any) => {
        console.log(err);
        return res.status(400).send();
    })

    res.send(options);
});

router.post('/register', async (req, res) => {

    if(!req.body.challengeResponse) return res.status(400).send();

    // get the signed credentials and the expected challenge from request
    const { challenge, credentials, deviceToken } = req.body.challengeResponse;

    // TODO add check for largeBlob supported

    // find user with expected challenge
    const user = await prisma.user.findUnique({
        where: {
            challenge: challenge,
        },
        include: {
            devices: true
        }

    }).catch((err: any) => {
        console.log(err);
        return res.status(400).send();
    }) as UserWithDevices

    // user with challenge not found, return error
    if (!user) return res.sendStatus(400);

    let verification;
    try {
        // credentials.response.id = credentials.id;
        const opts = {
            response: credentials,
            expectedChallenge: `${user.challenge}`,
            expectedOrigin,
            expectedRPID: rpId,
        };
        // opts.credential.response.id = opts.credential.id;
        console.log(opts);
        verification = await verifyRegistrationResponse(opts);
    } catch (error) {
        const _error = error;
        console.error(_error);
        return res.status(400).send({ error: _error.message });
    }

    const { verified, registrationInfo } = verification;

    console.log("registration result");
    console.log(verified);
    console.log(registrationInfo);

    if (verified && registrationInfo) {
        const { credentialPublicKey, credentialID, counter } = registrationInfo;

        console.log(deviceToken);
        console.log(user.devices.length);

        // TODO handle multiple devices

        // check if user has already registered devices
        // if so, check if token for new device was provided
        // if not, return error and generate token and email
        // if(user.devices.length) {

        //     if(deviceToken == "") {

        //         // TODO generate token and send mail
        //         const token = "XYZ"

        //         await prisma.user.update({
        //             where: {
        //                 uid: user.uid
        //             },
        //             data: {
        //                 token: token,
        //             }
        //         }).catch((err: any) => {
        //             console.log(err);
        //             return res.status(400).send();
        //         })

        //         return res.status(500).send();
        //     } else {

        //         if(user.token != deviceToken) return res.status(400).send();
        //     }
        // }

        // check if device is already registered with user, else create device registration for user
        await prisma.device.upsert({
            where: {
                credentialId: Buffer.from(credentialID)
            },
            update: {
                userUId: user.uid,
                counter: counter
            },
            create: {
                userUId: user.uid,
                credentialPublicKey: Buffer.from(credentialPublicKey),
                credentialId: Buffer.from(credentialID),
                counter: counter
            }
        })
    }

    res.send({ verified });
});

router.post('/login', async (req, res) => {

    if(!req.body.userInfo) return res.status(400).send();

    const { userMail } = req.body.userInfo;

    // search for user if name already exists, else generate new user
    const user = await prisma.user.findUnique({
        where: {
            mail: userMail,
        },
        include: {
            devices: true
        }
    }).catch((err: any) => {
        console.log(err);
        return res.status(400).send();
    }) as UserWithDevices

    console.log(user);

    if (!user) return res.status(400).send();

    const opts = {
        timeout: 60000,
        allowCredentials: user.devices.map(dev => ({
            id: dev.credentialId,
            type: 'public-key',
            transports: dev.transports || ['usb', 'ble', 'nfc', 'internal'],
        })),
        /**
         * This optional value controls whether or not the authenticator needs be able to uniquely
         * identify the user interacting with it (via built-in PIN pad, fingerprint scanner, etc...)
         */
        userVerification: 'preferred',
        rpId,
        extensions: {
            largeBlob: {
                read: true
            }
        },
    };

    const options = await generateAuthenticationOptions(opts);

    // update the user challenge
    await prisma.user.update({
        where: {
            uid: user.uid
        },
        data: {
            challenge: options.challenge,
        }
    }).catch((err: any) => {
        console.log(err);
        return res.status(400).send();
    })

    res.send(options);
});

router.post('/login-write', async (req, res) => {

    if(!req.body.userInfo) return res.status(400).send();

    const { userMail } = req.body.userInfo;

    // search for user if name already exists, else generate new user
    const user = await prisma.user.findUnique({
        where: {
            mail: userMail,
        },
        include: {
            devices: true
        }
    }).catch((err: any) => {
        console.log(err);
        return res.status(400).send();
    }) as UserWithDevices

    console.log(user);

    if (!user) return res.status(400).send();

    const opts = {
        timeout: 60000,
        allowCredentials: user.devices.map(dev => ({
            id: dev.credentialId,
            type: 'public-key',
            transports: dev.transports || ['usb', 'ble', 'nfc', 'internal'],
        })),
        /**
         * This optional value controls whether or not the authenticator needs be able to uniquely
         * identify the user interacting with it (via built-in PIN pad, fingerprint scanner, etc...)
         */
        userVerification: 'preferred',
        rpId,
        extensions: {
            largeBlob: {
                write: new Uint8Array(1),
            }
        },
    };

    const options = await generateAuthenticationOptions(opts);

    // update the user challenge
    await prisma.user.update({
        where: {
            uid: user.uid
        },
        data: {
            challenge: options.challenge,
        }
    }).catch((err: any) => {
        console.log(err);
        return res.status(400).send();
    })

    res.send(options);
});

router.post('/login-challenge', async (req, res) => {

    const body = req.body;

    if(!req.body.challengeResponse) return res.status(400).send();

    const { challenge, credentials } = req.body.challengeResponse;

    // search for user by challenge
    const user = await prisma.user.findUnique({
        where: {
            challenge: challenge,
        },
        include: {
            devices: true
        }
    }).catch((err: any) => {
        console.log(err);
        return res.status(400).send();
    }) as UserWithDevices

    let dbAuthenticator;
    const bodyCredIDBuffer = base64url.toBuffer(credentials.rawId);
    // "Query the DB" here for an authenticator matching `credentialID`
    for (const dev of user.devices) {
        if (dev.credentialId.equals(bodyCredIDBuffer)) {
            dbAuthenticator = dev;
            break;
        }
    }

    if (!dbAuthenticator) {
        throw new Error(`could not find authenticator matching ${body.id}`);
    }

    let verification;
    try {
        const opts = {
            response: credentials,
            expectedChallenge: `${user.challenge}`,
            expectedOrigin,
            expectedRPID: rpId,
            authenticator: dbAuthenticator,
        };
        verification = await verifyAuthenticationResponse(opts);
    } catch (error) {
        const _error = error;
        console.error(_error);
        return res.status(400).send({ error: _error.message });
    }

    const { verified, authenticationInfo } = verification;

    if (verified) {
        // Update the authenticator's counter in the DB to the newest count in the authentication
        dbAuthenticator.counter = authenticationInfo.newCounter;

        // create key pair for signing and verifying json web token
        const { publicKey, privateKey } = await generateKeyPair('ES256')

        // generate jwk from public to include into token header
        const publicJwk = await exportJWK(publicKey)

        // create new json web token for api calls
        const jwt = await new SignJWT({ 'urn:example:claim': true, 'userId': user.uid })
            .setProtectedHeader({ alg: 'ES256', jwk: publicJwk })
            .setIssuedAt()
            .setIssuer('urn:example:issuer')
            .setAudience('urn:example:audience')
            // .setExpirationTime('2h') // no exp time
            .sign(privateKey)

        // add self generated jwt to whitelist
        await addToWebAuthnTokens(jwt);
        
        return res.send({verified, jwt})
    }

    res.send({ verified })
});

router.post('/test-token', async (req, res) => {

    if(!req.body.userMail) return res.status(400).send();
    
    // get user mail from request body
    const mail = req.body.userMail

    // find userId for given mail
    const user = await prisma.user.findUnique({
        where: {
            mail: mail,
        }
    }).catch((err) => {
        console.log(err);
        return res.status(400).send();
    }) as User

    // check if user with given mail acutally exists
    if(!user) return res.status(400).send();

    // create key pair for creating json web token
    const { publicKey, privateKey } = await generateKeyPair('ES256')

    const publicJwk = await exportJWK(publicKey)

    // create new json web token for api calls
    const jwt = await new SignJWT({ 'urn:example:claim': true, 'userId': user.uid })
        .setProtectedHeader({ alg: 'ES256', jwk: publicJwk })
        .setIssuedAt()
        .setIssuer('urn:example:issuer')
        .setAudience('urn:example:audience')
        // .setExpirationTime('2h') // no exp time
        .sign(privateKey)

    // add self generated jwt to whitelist
    await addToWebAuthnTokens(jwt);

    res.send({jwt})

});