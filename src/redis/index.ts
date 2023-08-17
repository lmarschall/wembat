import redis = require('redis');

// redis set for storing issued json web tokens
// aims to whitelist all self generated json web tokens
// and to prevent third party token forging

const port = process.env.REDIS_PORT || 6379
const host = process.env.REDIS_HOST || "127.0.0.1"

const redisurl = `redis://${host}:${port}`;
const client = redis.createClient({url: redisurl});

export const initRedis = async () => {
    
    console.log(`connecting to redis cache ${redisurl}`);
    
    client.on('connect', () => {
        console.log('connected to redis cache!');
    });
    
    client.connect();
}

export const checkRedisCache = async (req, res, next) => {

    console.log("check redis cache.");
    const requestUrl = req.originalUrl;

    const exist = await client.exists(requestUrl)

    if(exist === 1) {
        console.log("loading data from cache");
        const data = await client.get(requestUrl);
        return res.status(200).send(JSON.parse(data));
    } else {
        console.log("no data available");
        return next();
    }
}

export const resetRedisCache = async (url: string) => {
    console.log("resetting redis cache");
    await client.del(url);
}

export const addToRedisCache = async (url: string, items: string) => {
    console.log("adding to redis cache");
    await client.set(url, items);
}

export const addToServiceTokens = async (token: string) => {
    console.log(`adding ${token} to service tokens`);
    const result = await client.sAdd('service_tokens', token);
    if(result === 1) {
        return true;
    } else {
        return false;
    }
}

export const addToWebAuthnTokens = async (token: string) => {
    console.log(`adding ${token} to webauthn tokens`);
    const result = await client.sAdd('webauthn_tokens', token);
    if(result === 1) {
        return true;
    } else {
        return false;
    }
}

export const checkForServiceToken = async (token: string) => {
    console.log(`checking if service token ${token} exists`);
    const result = await client.sIsMember('service_tokens', token);
    return result;
}

export const checkForWebAuthnToken = async (token: string) => {
    console.log(`checking if webauthn token ${token} exists`);
    const result = await client.sIsMember('webauthn_tokens', token);
    return result;
}