'use strict';

const FocalsClient = require('@bynorth/focals-client-js');
const config = require('nconf');
const bodyParser = require('body-parser');
const express = require('express');

const configPath = __dirname;

config
    .use('memory')
    .argv()
    .env({ lowerCase: true, separator: '__' })
    .file('default', { file: `${configPath}/default.json` });


FocalsClient.init(config.get('quickstart'));

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/', require('./routes'));

const port = config.get('port');
app.listen(port, () => console.log(`HTTP server on!${port}`));
