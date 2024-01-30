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

    try {

        if(!req.body.userInfo) throw Error("User Info not present");

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
            throw Error("User could not be found or created in database");
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

        const options = await generateRegistrationOptions(opts).catch((err: any) => {
            console.log(err);
            throw Error("Registration Option could not be generated");
        })

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
            throw Error("User challenge could not be updated");
        })

        res.status(200).send(JSON.stringify({ "options": options }));

    } catch (error) {
        console.log(error);
        return res.status(201).send(error.message);
    }
});

webauthnRoutes.post('/register', async (req, res) => {

    try {
        
        if(!req.body.challengeResponse) throw Error("Challenge Response not present");

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
            throw Error("Could not find user for given challenge");
        }) as UserWithDevices
    
        // user with challenge not found, return error
        if (!user) throw Error("Could not find user for given challenge");
    
        // credentials.response.id = credentials.id;
        const opts = {
            response: credentials,
            expectedChallenge: `${user.challenge}`,
            expectedOrigin,
            expectedRPID: rpId,
        };
    
        // opts.credential.response.id = opts.credential.id;
        console.log(credentials.response.transports);
        const verification = await verifyRegistrationResponse(opts).catch((err: any) => {
            console.log(err);
            throw Error("Registration Response could not be verified");
        })
    
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
            }).catch((err: any) => {
                console.log(err);
                throw Error("Device Regitration update or create failed");
            })
        }
    
        res.status(200).send(JSON.stringify({ "verified": verified }));

    } catch (error) {
        console.log(error);
        return res.status(201).send(error.message);
    }
});

webauthnRoutes.post('/request-login', async (req, res) => {

    try {

        if(!req.body.userInfo) throw Error("User info not present");

        const { userMail } = req.body.userInfo;
    
        // search for user
        const user = await prisma.user.findUnique({
            where: {
                mail: userMail,
            },
            include: {
                devices: true
            }
        }).catch((err: any) => {
            console.log(err);
            throw Error("User could not be found in database");
        }) as UserWithDevices
    
        if (user == null) throw Error("User could not be found in database");

        console.log(user);
    
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
    
        const options = await generateAuthenticationOptions(opts).catch((err: any) => {
            console.log(err);
            throw Error("Authentication Options could not be generated");
        })
    
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
            throw Error("Updating user challenge failed");
        })
        
        const string = JSON.stringify({ "options": options, "publicUserKey": publicUserKey });
        res.status(200).send(string);
        
    } catch (error) {
        console.log(error);
        return res.status(201).send(error.message);
    }
});

webauthnRoutes.post('/login', async (req, res) => {

    try {

        const body = req.body;

        if(!req.body.challengeResponse) throw Error("Challenge Response not present");
    
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
            throw Error("User with given challenge not found");
        }) as UserWithDevices
    
        if (!user) throw Error("User with given challenge not found");
    
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
            throw new Error(`Could not find authenticator matching ${body.id}`);
        }
    
        const opts = {
            response: credentials,
            expectedChallenge: `${user.challenge}`,
            expectedOrigin,
            expectedRPID: rpId,
            authenticator: dbAuthenticator,
        };
    
        const verification = await verifyAuthenticationResponse(opts).catch((err: any) => {
            console.log(err);
            throw Error("Authentication Response could not be verified");
        })
    
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
                throw Error("Could not save publicKey in database");
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
            
            return res.status(200).send(JSON.stringify({ "verified": verified, "jwt": jwt }))
        } else {
            throw Error("Could not verifiy reponse")
        }
        
    } catch (error) {
        console.log(error);
        return res.status(201).send(error.message);
    }
});