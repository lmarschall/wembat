
import cors from 'cors';
import helmet from 'helmet';
import express from 'express';
import bodyParser from 'body-parser';
import compression from 'compression';

import webauthn = require('./webauthn');
import redis = require('./redis');

const port = process.env.PORT || 8080;

redis.initRedis();

const app = express();

const whitelist = ['https://localhost:3000'];

const corsOptionsDelegate = (req, callback) => {

    let corsOptions;

    const origin = req.header('Origin')

    let isDomainAllowed = whitelist.indexOf(origin) !== -1;

    if (isDomainAllowed) {
        // Enable CORS for this request
        corsOptions = { origin: true }
    } else {
        // Disable CORS for this request
        corsOptions = { origin: false }
    }
    callback(null, corsOptions)
}

app.use(cors(corsOptionsDelegate));
app.use(helmet());
app.use(compression()); // COMPRESSION
app.use(bodyParser.json({limit: '1mb'}));
app.use('/webauthn', webauthn.router);

app.listen(port, () => {

    return console.log(`server is listening on ${port}`);
});