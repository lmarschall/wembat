import dotenv from 'dotenv';
import { randomBytes } from 'node:crypto';
dotenv.config();

export let configService: ConfigService;

export async function initConfig(): Promise<boolean> {
    try {
        configService = new ConfigService();
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}

export class ConfigService {
    private readonly serverUrl: string;
    private readonly redisUrl: string;
    private readonly dashboardUrl: string;
    private readonly databaseUrl: string;
    private readonly sessionSecret: string;
    private readonly trustProxy: boolean | number | string;

    constructor() {
        const serverHost = process.env.SERVER_HOST || "http://localhost";
        const serverPort = process.env.SERVER_PORT || 8080;
        this.serverUrl = `${serverHost}:${serverPort}`;
        const redisPort = process.env.REDIS_PORT || 6379;
        const redisHost = process.env.REDIS_HOST || "127.0.0.1";
        this.redisUrl = `redis://${redisHost}:${redisPort}`;
        const dashboardHost = process.env.DASHBOARD_HOST || "http://localhost";
        const dashboardPort = process.env.DASHBOARD_PORT || 9090;
        this.dashboardUrl = `${dashboardHost}:${dashboardPort}`;
        const databaseUser = process.env.DATABASE_USER || "postgresUser";
        const databasePassword = process.env.DATABASE_PASSWORD || "postgresPassword";
        const databaseDB = process.env.DATABASE_DB || "postgresDatabase";
        const databaseHost = process.env.DATABASE_HOST || "localhost";
        const databasePort = 5432;
        this.databaseUrl = `postgresql://${databaseUser}:${databasePassword}@${databaseHost}:${databasePort}/${databaseDB}?connect_timeout=300`;
        // Falls back to a per-process random secret rather than a fixed default, so a
        // missing env var can't result in a publicly-known session-signing secret.
        this.sessionSecret = process.env.SESSION_SECRET || randomBytes(32).toString("hex");
        // Defaults to not trusting X-Forwarded-* headers: trusting them without an
        // actual reverse proxy in front lets clients spoof their IP and bypass the
        // rate limiter. Set TRUST_PROXY (e.g. "1" for a single hop, or a subnet) when
        // the server does sit behind a real proxy/load balancer.
        const trustProxyEnv = process.env.TRUST_PROXY;
        if (trustProxyEnv == undefined) {
            this.trustProxy = false;
        } else if (trustProxyEnv === "true" || trustProxyEnv === "false") {
            this.trustProxy = trustProxyEnv === "true";
        } else if (!Number.isNaN(Number(trustProxyEnv))) {
            this.trustProxy = Number(trustProxyEnv);
        } else {
            this.trustProxy = trustProxyEnv;
        }
    }

    getServerUrl() {
        return this.serverUrl;
    }

    getRedisUrl() {
        return this.redisUrl;
    }
    
    getDashboardUrl() {
        return this.dashboardUrl;
    }

    getDatabaseUrl() {
        return this.databaseUrl;
    }

    getSessionSecret() {
        return this.sessionSecret;
    }

    getTrustProxy() {
        return this.trustProxy;
    }
}