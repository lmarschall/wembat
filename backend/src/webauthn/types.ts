import { Prisma } from "@prisma/client";
import {
	AuthenticationResponseJSON,
	RegistrationResponseJSON,
} from "@simplewebauthn/typescript-types";

export type UserInfo = {
	userMail: string
}

// can be put in the wembat client types
export type RegisterChallengeResponse = {
	challenge: string;
	credentials: RegistrationResponseJSON;
};

export type LoginChallengeResponse = {
	challenge: string;
	credentials: AuthenticationResponseJSON;
};

export type UserWithDevices = Prisma.UserGetPayload<{
	include: { devices: true };
}>;

export type UserWithDevicesAndSessions = Prisma.UserGetPayload<{
	include: { devices: true; sessions: true };
}>;

export interface ExtensionsLargeBlobSupport
	extends AuthenticationExtensionsClientInputs {
	largeBlob: {
		support: string;
	};
}

export interface ExtensionsLargeBlobWrite
	extends AuthenticationExtensionsClientInputs {
	largeBlob: {
		write: Uint8Array;
	};
}

export interface ExtensionsLargeBlobRead
	extends AuthenticationExtensionsClientInputs {
	largeBlob: {
		read: boolean;
	};
}
