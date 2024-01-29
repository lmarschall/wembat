import { Router} from 'express';
import base64url from 'base64url';
import { addToWebAuthnTokens } from '../redis';
import { createJWT } from '../crypto';
import { PrismaClient, User, Prisma } from '@prisma/client';
import {
    // Registration
    generateRegistrationOptions,
    verifyRegistrationResponse,
    // Authentication
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
    GenerateRegistrationOptionsOpts,
} from '@simplewebauthn/server';

type UserWithDevices = Prisma.UserGetPayload<{
    include: { devices: true }
}>

export const webauthnRoutes = Router();
const prisma = new PrismaClient();
const rpId = process.env.RPID || "localhost:3000";
const rpName = "Wembat";
const expectedOrigin = `https://${rpId}:3000`;

console.log('server is starting webauthn services')

webauthnRoutes.post('/request-register', async (req, res) => {

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

    const opts: any = {
        rpName: rpName,
        rpId,
        userID: user.uid,
        userName: userMail,
        timeout: 60000,
        attestationType: 'none',
        excludeCredentials: user.devices.map(dev => ({
          id: dev.credentialId,
          type: 'public-key',
          transports: dev.transports,
        })),
        authenticatorSelection: {
            residentKey: 'preferred',
            userVerification: 'preferred',
        },
        supportedAlgorithmIDs: [-7, -257],
        extensions: {
            largeBlob: {
                support: "required"
            }
        }
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

webauthnRoutes.post('/register', async (req, res) => {

    if(!req.body.challengeResponse) return res.status(400).send();

    // get the signed credentials and the expected challenge from request
    const { challenge, credentials, deviceToken } = req.body.challengeResponse;

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
        console.log(credentials.response.transports);
        verification = await verifyRegistrationResponse(opts);
    } catch (error) {
        const _error = error;
        console.error(_error);
        return res.status(400).send({ error: _error.message });
    }

    const { verified, registrationInfo } = verification;

    console.log("registration result");
    console.log(verified);
    // console.log(registrationInfo);

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
                counter: counter,
                transports: credentials.response.transports
            }
        })
    }

    res.send({ verified });
});

webauthnRoutes.post('/request-login', async (req, res) => {

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

    let opts = {}
    // const pubKey = user.publicKey;

    const publicUserKey = user.publicKey;
    // const publicServerKey = getPublicServerSecretKey();

    if(publicUserKey !== "") {
        opts = {
            timeout: 60000,
            allowCredentials: user.devices.map(dev => ({
                id: dev.credentialId,
                type: 'public-key',
                transports: dev.transports
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
            }
        }

        // publicUserKey = await getPublicKeyFromString(user.publicKey);
        // const sharedSecret = await createSharedSecret(publicUserKey);

        // save secret on redis
    } else {
        opts = {
            timeout: 60000,
            allowCredentials: user.devices.map(dev => ({
                id: dev.credentialId,
                type: 'public-key',
                transports: dev.transports
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
            }
        }
    }

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

    res.send({ options, publicUserKey });
});

webauthnRoutes.post('/login', async (req, res) => {

    const body = req.body;

    if(!req.body.challengeResponse) return res.status(400).send();

    const { challenge, credentials, pubKey, secret } = req.body.challengeResponse;

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

    if (!user) return res.status(400).send();

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

        // save pubKey
        await prisma.user.update({
            where: {
                uid: user.uid
            },
            data: {
                publicKey: pubKey,
            }
        }).catch((err: any) => {
            console.log(err);
            return res.status(400).send();
        })

        // if(user.secret !== "" && user.secret == secret) {

        // } else {
        //     // TODO only compare secret if one is present on user
        //     const publicUserKey = await getPublicKeyFromString(pubKey)
        //     const sharedSecret = await createSharedSecret(publicUserKey);

        //     if(sharedSecret !== secret) {
        //         // TODO throw error
        //     } else {
        //         await prisma.user.update({
        //             where: {
        //                 uid: user.uid
        //             },
        //             data: {
        //                 publicKey: pubKey,
        //             }
        //         }).catch((err: any) => {
        //             console.log(err);
        //             return res.status(400).send();
        //         })
        //     }
        // }

        // Update the authenticator's counter in the DB to the newest count in the authentication
        dbAuthenticator.counter = authenticationInfo.newCounter;        

        // create new json web token for api calls
        const jwt = await createJWT(user);

        // add self generated jwt to whitelist
        await addToWebAuthnTokens(jwt);
        
        return res.send({verified, jwt})
    }

    res.send({ verified })
});