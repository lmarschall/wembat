
import { checkForWebAuthnToken } from "../redis";
import { decodeProtectedHeader, importJWK, jwtVerify } from 'jose';

export const validateWebAuthnToken = async (req, res, next) => {

    console.log("validate token");

    if (req.headers.authorization) {
        try {
            const authorization = req.headers.authorization.split(' ');
            if (authorization[0] !== 'Bearer') {
                return res.status(401).send();
            } else {
                // get jwt token from auth header
                const jwt = authorization[1]

                // check if jwt token was issued by us
                if(await checkForWebAuthnToken(jwt) === false) return res.status(401).send();

                // extract public key from jwk parameters
                const header = decodeProtectedHeader(jwt)
                const algorithm = header.alg
                const spki = header.jwk
                const importedKey = await importJWK(spki, algorithm)

                try {
                    const { payload, protectedHeader } = await jwtVerify(jwt, importedKey, {
                        issuer: 'urn:example:issuer',
                        audience: 'urn:example:audience',
                        algorithms: ['ES256']
                    })
                    res.locals.payload = payload;
                    // console.log(protectedHeader)
                    // console.log(payload)
                } catch(error) {
                    console.log(error.code)
                    return res.status(401).send();
                }
                return next();
            }
        } catch (err) {
            return res.status(403).send();
        }
    } else {
        return res.status(401).send();
    }
};