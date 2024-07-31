import { Prisma } from "@prisma/client";

export type UserWithDevices = Prisma.UserGetPayload<{
	include: { devices: true };
}>;

export type UserWithDevicesAndSessions = Prisma.UserGetPayload<{
	include: { devices: true, sessions: true };
}>;

export interface ExtensionsLargeBlobSupport extends AuthenticationExtensionsClientInputs {
	largeBlob: {
		support: string;
	};
}

export interface ExtensionsLargeBlobWrite extends AuthenticationExtensionsClientInputs {
	largeBlob: {
		write: Uint8Array;
	};
}

export interface ExtensionsLargeBlobRead extends AuthenticationExtensionsClientInputs {
	largeBlob: {
		read: boolean,
	};
}