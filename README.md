# Focals Developer API Quickstart

This repository is intended to be used as a quickstart to show what's needed to create an ability for the Focals Developer API for Focals by North.  
The initial example is provided only in NodeJS and is a barebones implementation - so things such as user management, caching, or a full implementation of features isn't provided.  

## Components

### index.js
This is the entrypoint of the application.  
In here we set up reading the config file, initialize the `focals-client-js` package, and set up the [Express](https://expressjs.com/) routes and starts the web server.  
You'll want to replace the values in `default.json` with the values for your own ability.  
The way config is handled, or the web framework used, are optional - these are just set up to provide an example.

### routes.js
This is where the endpoints are defined that were applied in the above `index.js` file.  
We have 3 routes configured in this quickstart example:
1. `POST /trigger`
    - This endpoint is used to send a packet to all users that have enabled your ability on Focals. In this example, we send a secure packet using end-to-end encryption by first retrieving the user's public keys, using the keys to encrypt the packet, and then posting the encrypted packet to the North endpoint.
    - **NOTE** - The packet provided is not complete, and will want to be modified for your ability.
2. `GET  /enable`
    - This endpoint is used to allow users to enable your ability. This is the endpoint that will be configured as the `Enable URL` on the [Developer Portal](https://developer.bynorth.com) for your ability.
    - The `focals-client-js` package is used to verify the received signature, and as this is just an example we perform no further checks and simply allow the user to enable the ability.
    - **NOTE** - No storage or caching mechanism is in place in this quickstart, users are simply stored in a dictionary in memory. For a production ready ability, you'll want to implement a method of storing users however you want to.
3. `POST /action`
    - This endpoint is used to handle actions received from the Focals Developer API relating to a user. This is the endpoint that will be configured as the `Webhook URL` on the [Developer Portal](https://developer.bynorth.com) for your ability.
    - **NOTE** - The only actions configured in this quickstart example are `integration:validate` and `integration:disable` which are used for handling the user enable and disable flows.

### default.json
This is an example configuration file which contains the `API Key`, `API Secret`, `Shared Secret` and `Integration ID` for your ability.  
**NOTE** - These have been left blank and will need to be configured with values for your ability. These get generated for you when you first create your ability on the portal.  
An alternative is to populating the file is to use environment variables to set the values. This can be done by setting environment variables with the `quickstart` prefix, followed by two underscores and the name of the variable. For example, `sharedSecret` would be `quickstart__sharedSecret`.

## Dependencies
- `@bynorth/focals-client-js`
    - This is the library published by North to help ease the development of Abilities. This provides useful functionality to help implement end-to-end encryption, to verify received HMAC signatures, to retrieve a user's public keys for their Focals, and to build the enable URL.
- `nconf`
    - This package has been added to handle the configuration for the application using environment variables or a provided config file.
- `request-promise-native`
    - This package has been added to handle network requests so that the ability can send requests to the Focals Developer API.
- `semver`
    - This package has been added to easily validate the version of a packet received on the `/action` endpoint.

None of these libraries are mandatory - you can implement an ability any way you see fit (and in any language). We hope you find the `focals-client-js` package to be of use in making the development process easier.
