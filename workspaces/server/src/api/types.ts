import { Prisma } from "@prisma/client";
import {
	AuthenticationResponseJSON,
	RegistrationResponseJSON,
} from "@simplewebauthn/types";

export type UserInfo = {
	userMail: string;
};

export type SessionInfo = {
	userMail: string;
	sessionId: string;
};

export type RegisterChallengeResponse = {
	challenge: string;
	credentials: RegistrationResponseJSON;
};

export type linkChallengeResponse = {
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
	extends Omit<AuthenticationExtensionsClientInputs, 'largeBlob'> {
	largeBlob: {
		write: BufferSource;
	};
}

export interface ExtensionsLargeBlobRead
	extends AuthenticationExtensionsClientInputs {
	largeBlob: {
		read: boolean;
	};
}

export type ApplicationInfo = {
	appUId: string;
	appName: string;
	appDomain: string;
};
