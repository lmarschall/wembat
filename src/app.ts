
import cors from 'cors';
import helmet from 'helmet';
import express from 'express';
import bodyParser from 'body-parser';
import compression from 'compression';

import report = require('./report');
import application = require('./application');
import serviceauthn = require('./serviceauthn');
import webauthn = require('./webauthn');
import redis = require('./redis');
// import mail = require('./mail');

const port = process.env.PORT || 8080;

redis.initRedis();
// mail.sendMail();

const app = express();

// const medcastUrlRegExp = /(http(s)?:\/\/)(.foodover.app)|(localhost)/;
// const corsOptions = {
//     origin: medcastUrlRegExp
// };

// app.use(cors(corsOptions));

const whitelist = ['https://localhost:3000', 'https://pwahub.one'];

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
// app.use(cors());
app.use(helmet());
app.use(compression()); // COMPRESSION
app.use(bodyParser.json({limit: '1mb'}));
app.use('/report', report.router);
app.use('/application', application.router);
app.use('/serviceauthn', serviceauthn.router);
app.use('/webauthn', webauthn.router);

app.listen(port, () => {

    return console.log(`server is listening on ${port}`);
});