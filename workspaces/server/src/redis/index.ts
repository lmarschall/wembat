import { createClient } from "redis";
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '#prisma';
import { configService } from "#config";

export let redisService: RedisService;

export async function initRedis(): Promise<boolean> {
	try {
		redisService = new RedisService();
		await redisService.connect();
		await redisService.initWhitelist();
		return true;
	} catch (err) {
		console.error(err);
		return false;
	}
}

export class RedisService {
	
	private readonly redisUrl = configService.getRedisUrl();
	private readonly dashboardUrl = configService.getDashboardUrl();
	private readonly databaseUrl = configService.getDatabaseUrl();
	private readonly client = createClient({ url: this.redisUrl });
	private readonly pgAdapter = new PrismaPg({ connectionString: this.databaseUrl });
	private readonly prisma = new PrismaClient({ adapter: this.pgAdapter });

	constructor() {
		this.client.on("connect", () => {
			console.log("connected to redis cache!");
		});
	}

	async connect() {
		console.log(`connecting to redis cache ${this.redisUrl}`);

		await this.client.connect();
	}

	async initWhitelist(): Promise<boolean> {
		try {
			const apps = await this.prisma.application.findMany();

			for (const app of apps) {
				const appUrl = `https://${app.domain}`;
				this.addToDomainWhitelist(appUrl);
			}
			this.addToDomainWhitelist(this.dashboardUrl);
			return true;
		} catch (err) {
			console.error(err);
			return false;
		}
	}

	async resetRedisCache(url: string) {
		console.log("resetting redis cache");
		await this.client.del(url);
	}

	async addToRedisCache(url: string, items: string) {
		console.log("adding to redis cache");
		await this.client.set(url, items);
	}

	async addToServiceTokens(token: string) {
		console.log(`adding ${token} to service tokens`);
		const result = await this.client.sAdd("service_tokens", token);
		if (result === 1) {
			return true;
		} else {
			return false;
		}
	}

	async addToWebAuthnTokens(token: string) {
		console.log(`adding ${token} to webauthn tokens`);
		const result = await this.client.sAdd("webauthn_tokens", token);
		if (result === 1) {
			return true;
		} else {
			return false;
		}
	}

	async addToDomainWhitelist(url: string) {
		console.log(`adding ${url} to domain whitelist`);
		const result = await this.client.sAdd("domain_whitelist", url);
		if (result === 1) {
			return true;
		} else {
			return false;
		}
	}

	async removeFromDomainWhitelist(url: string) {
		console.log(`adding ${url} to domain whitelist`);
		const result = await this.client.sRem("domain_whitelist", url);
		if (result === 1) {
			return true;
		} else {
			return false;
		}
	}

	async checkForDomainInWhiteList(url: string) {
		console.log(`checking if url ${url} exists in domain whitelist`);
		const result = await this.client.sIsMember("domain_whitelist", url);
		return result;
	}

	async checkForServiceToken(token: string) {
		console.log(`checking if service token ${token} exists`);
		const result = await this.client.sIsMember("service_tokens", token);
		return result;
	}

	async checkForWebAuthnToken(token: string) {
		console.log(`checking if webauthn token ${token} exists`);
		const result = await this.client.sIsMember("webauthn_tokens", token);
		return result;
	}
}
