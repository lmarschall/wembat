import { validateWebAuthnToken } from "./functions/validateWebAuthn";
import { validateApplicationToken } from "./functions/validateApplication";
import { validateAdminToken } from "./functions/validateAdmin";

export const validateAppFunctions = [validateApplicationToken];
export const validateWebAuthnFunctions = [validateWebAuthnToken];
export const validateAdminFunctions = [validateAdminToken];