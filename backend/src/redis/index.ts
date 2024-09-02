import { createClient } from "redis";

// redis set for storing issued json web tokens
// aims to whitelist all self generated json web tokens
// and to prevent third party token forging

const port = process.env.REDIS_PORT || 6379;
const host = process.env.REDIS_HOST || "127.0.0.1";

const redisurl = `redis://${host}:${port}`;
const client = createClient({ url: redisurl });

export async function initRedis(): Promise<boolean> {

	try {
		console.log(`connecting to redis cache ${redisurl}`);

		client.on("connect", () => {
			console.log("connected to redis cache!");
		});

		await client.connect();
		return true;
	} catch (err) {
		console.error(err);
		return false;
	}
}

export async function resetRedisCache(url: string) {
	console.log("resetting redis cache");
	await client.del(url);
}

export async function addToRedisCache(url: string, items: string) {
	console.log("adding to redis cache");
	await client.set(url, items);
}

export async function addToServiceTokens(token: string) {
	console.log(`adding ${token} to service tokens`);
	const result = await client.sAdd("service_tokens", token);
	if (result === 1) {
		return true;
	} else {
		return false;
	}
}

export async function addToWebAuthnTokens(token: string) {
	console.log(`adding ${token} to webauthn tokens`);
	const result = await client.sAdd("webauthn_tokens", token);
	if (result === 1) {
		return true;
	} else {
		return false;
	}
}

export async function checkForServiceToken(token: string) {
	console.log(`checking if service token ${token} exists`);
	const result = await client.sIsMember("service_tokens", token);
	return result;
}

export async function checkForWebAuthnToken(token: string) {
	console.log(`checking if webauthn token ${token} exists`);
	const result = await client.sIsMember("webauthn_tokens", token);
	return result;
}
