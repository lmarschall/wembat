-- CreateTable
CREATE TABLE "User" (
    "uid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "salt" BYTEA NOT NULL,
    "challenge" TEXT NOT NULL DEFAULT E'',

    CONSTRAINT "User_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Device" (
    "uid" TEXT NOT NULL,
    "userUId" TEXT NOT NULL,
    "credentialPublicKey" BYTEA NOT NULL,
    "credentialId" BYTEA NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "transports" TEXT[],

    CONSTRAINT "Device_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Application" (
    "uid" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL DEFAULT E'',
    "privateKey" TEXT NOT NULL DEFAULT E'',

    CONSTRAINT "Application_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Session" (
    "uid" TEXT NOT NULL,
    "appUId" TEXT NOT NULL,
    "userUId" TEXT NOT NULL,
    "deviceUId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL DEFAULT E'',
    "privateKey" TEXT NOT NULL DEFAULT E'',
    "nonce" TEXT NOT NULL DEFAULT E'',

    CONSTRAINT "Session_pkey" PRIMARY KEY ("uid")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_name_key" ON "User"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_challenge_key" ON "User"("challenge");

-- CreateIndex
CREATE UNIQUE INDEX "Device_credentialId_key" ON "Device"("credentialId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_url_key" ON "Application"("url");

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_userUId_fkey" FOREIGN KEY ("userUId") REFERENCES "User"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userUId_fkey" FOREIGN KEY ("userUId") REFERENCES "User"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_deviceUId_fkey" FOREIGN KEY ("deviceUId") REFERENCES "Device"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_appUId_fkey" FOREIGN KEY ("appUId") REFERENCES "Application"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;
