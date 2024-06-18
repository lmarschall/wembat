-- CreateTable
CREATE TABLE "User" (
    "uid" TEXT NOT NULL,
    "challenge" TEXT NOT NULL DEFAULT E'',
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL DEFAULT E'',
    "publicKey" TEXT NOT NULL DEFAULT E'',
    "salt" TEXT NOT NULL DEFAULT E'',

    CONSTRAINT "User_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" SERIAL NOT NULL,
    "userUId" TEXT NOT NULL,
    "credentialPublicKey" BYTEA NOT NULL,
    "credentialId" BYTEA NOT NULL,
    "counter" INTEGER NOT NULL,
    "written" BOOLEAN NOT NULL DEFAULT false,
    "transports" TEXT[],

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_challenge_key" ON "User"("challenge");

-- CreateIndex
CREATE UNIQUE INDEX "User_name_key" ON "User"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Device_credentialId_key" ON "Device"("credentialId");

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_userUId_fkey" FOREIGN KEY ("userUId") REFERENCES "User"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;
