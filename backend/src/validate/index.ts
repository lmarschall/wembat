import { validateWebAuthnToken } from "./functions/validateWebAuthn";
import { validateApplicationToken } from "./functions/validateApplication";

export const validateAppToken = [validateApplicationToken];
export const validateJWTToken = [validateWebAuthnToken];