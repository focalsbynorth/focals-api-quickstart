'use strict';

const request = require('request-promise-native');
const FocalsClient = require('@bynorth/focals-client-js');
const config = require('nconf').get('quickstart');
const express = require('express');
const semver = require('semver');

const TOLERANCE_IN_SECONDS = 6 * 60;

const router = express.Router();

// For this quickstart example we're simply storing the enabled user information in a dictionary
// You'll want to implement some form of data storage to track these users
const usersEnabled = {};
const usersUnvalidated = {};

// This is an example packet, not fully populated
const packet = {
    packetId: 'north-quickstart-ability',
    timestamp: '',
    icon: {
        type: 'URL',
        value: 'https://via.placeholder.com/300'
    },
    title: 'North Quickstart',
    actions:
    [
        {
            type: 'system:reply',
            actionId: 'reply',
            title: 'Respond',
        },
        {
            type: 'system:webhook',
            title: 'Mark as Read',
            actionId: 'mark_as_read',
            icon: {
                type: 'URL',
                value: 'static:/system/icon/mark-as-read',
            },
        },
    ],
    body: 'Test quickstart message',
    templateId: 'actionable_text',
};

/**
 * Triggers a notification to all users that have your ability enabled on Focals, using end-to-end encryption.
 *
 * @param {string} req.query.sharedSecret - The shared secret to validate against to ensure the request came from your ability.
 *
 * @returns 200 OK  - If the actions were sent successfully to users.
 *
 * @throws Will throw an error if there's an issue retrieving public keys, encrypting the packet, or publishing to a user.
 */
router.post('/trigger', async (req, res) => {
    // Validate shared secret
    if (req.query.sharedSecret !== config.sharedSecret) {
        return res.sendStatus(401);
    }
    console.log(`about to send to ${JSON.stringify(usersEnabled)}`);
    for (const userId in usersEnabled) {
        try {
            console.log(`sending to ${userId}`);
            const publicKeys = await FocalsClient.DeviceKeysService.getPublicKeys(userId, config.integrationId);
            const pathsToEncrypt = [
                '/packetId',
                '/icon/value'
            ];
            console.log(`plain packet: ${JSON.stringify(packet)}`);
            const encryptedPacket = await FocalsClient.EncryptionService.encryptPacket(packet, pathsToEncrypt, publicKeys);
            console.log(JSON.stringify(encryptedPacket));
            // Publish secure message
            await request({
                method: 'POST',
                uri: 'https://cloud.bynorth.com/v1/api/integration/secure/publish-to-user',
                body: {
                    apiKey: config.apiKey,
                    apiSecret: config.apiSecret,
                    integrationId: config.integrationId,
                    targetUserId: userId,
                    packet: encryptedPacket
                },
                json: true
            });
        } catch (error) {
            throw new Error(`Error publishing secure packet: ${error.message}`);
        }
    }

    return res.sendStatus(200);
});

/**
 * Enable endpoint for the ability.
 * Validates the received signature, and if valid redirects to the North enable endpoint to confirm enabling your ability for the user.
 *
 * @param req.query.signature   - The HMAC signature for the request for validity.
 * @param req.query.state       - The unique state for the enable process for the user.
 * @param req.query.timestamp   - Timestamp of when the signature was generated and the request was sent.
 *
 * @returns 302 Redirect - Redirects to the North enable endpoint, including any errors that were encountered.
 */
router.get('/enable', async (req, res) => {
    const { signature, state, timestamp } = req.query;

    if (!FocalsClient.SignatureService.verifySignature(state, timestamp, signature)) {
        return res.redirect(FocalsClient.UrlService.buildEnableUrl('', 'invalid_state'));
    }

    usersUnvalidated[state] = Date.now();

    return res.redirect(FocalsClient.UrlService.buildEnableUrl(state));
});

/**
 * Webhook endpoint for the ability.
 * This endpoint is used to handle any incoming actions from North's Abilities Framework'.
 * 
 * @param req.query.sharedSecret - A shared secret that should match your ability's shared secret.
 * @param req.body.type          - The type of action received.
 * @param req.body.body.userId   - The userId relating to the action.
 * @param req.body.body.state    - The unique state for the enable process for the user.
 *
 * @returns 200 OK                      - If the action was handled successfully.
 * @returns 400 Bad Request             - If the received action type was unrecognised, or if the timestamp was outside the tolerance range.
 * @returns 500 Internal Server Error   - An unhandled exception was thrown.
 *
 * @throw Throws an error if the shared secret is missing or invalid.
 */
router.post('/action', async (req, res) => {
    const { sharedSecret } = req.query;

    if (!sharedSecret) {
        throw new Error('Did not provide shared secret');
    }

    if (sharedSecret !== config.sharedSecret) {
        throw new Error('Invalid Shared Secret');
    }

    try {
        console.log(`got an action ${JSON.stringify(req.body)}`);
        let { type, body } = req.body;

        // Check if the received packet is encrypted, and attempt to decrypt it if so
        if (body !== undefined && body.version && semver.valid(body.version) && semver.gte(body.version, '2.0.0')) {
            try {
                body = FocalsClient.EncryptionService.decryptPacket(body);
            }
            catch (err) {
                Logger.error('Unexpected error while decrypting action packet');
                throw err;
            }
        }

        if (type === 'integration:validate') {
            const { state, userId } = body;

            const userUnvalidatedTimestamp = usersUnvalidated[state] || 0;

            if (Math.abs(Date.now() - userUnvalidatedTimestamp) > TOLERANCE_IN_SECONDS) {
                return res.sendStatus(400);
            }

            usersEnabled[userId] = true;
            delete usersUnvalidated[state];

            return res.sendStatus(200);
        }

        if (type === 'integration:disable') {
            delete usersEnabled[body.userId];
            return res.sendStatus(200);
        }

        console.log(`unrecognized action: ${JSON.stringify(req.body)}`);

        return res.sendStatus(400);
    } catch (error) {
        return res.sendStatus(500);
    }
});

module.exports = router;
