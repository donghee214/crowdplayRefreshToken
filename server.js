// npm deps
const fetch = require('node-fetch');
const express = require('express');
const bodyParser = require('body-parser');
const {URLSearchParams} = require('url');
const crypto = require('crypto');

// Require the framework and instantiate it
const app = express();


var port = process.env.PORT || 8080;
// init spotify config
const spClientId = 'efb68c1445ae4ab783e0dcbed33c1f84';
const spClientSecret = '61afff17688e42d48952fd18d524eb1e';
const spClientCallback = 'jukebox://callback';
const authString = Buffer.from(`${spClientId}:${spClientSecret}`).toString('base64');
const authorizationHeader = `Basic ${authString}`;
const spotifyEndpoint = 'https://accounts.spotify.com/api/token';

// encryption
const encSecret = "test214";
const encrypt = text => {
	const aes = crypto.createCipher('aes-256-ctr', encSecret);
	let encrypted = aes.update(text, 'utf8', 'hex');
	encrypted += aes.final('hex');
	return encrypted;
};
const decrypt = text => {
	const aes = crypto.createDecipher('aes-256-ctr', encSecret);
	let decrypted = aes.update(text, 'hex', 'utf8');
	decrypted += aes.final('utf8');
	return decrypted;
};

// support form body
app.use(bodyParser.urlencoded({extended: true}));

/**
 * Swap endpoint
 * Uses an authentication code on body to request access and refresh tokens
 */
app.post('/swap', async (req, res) => {
	const data = new URLSearchParams();
	data.append('grant_type', 'authorization_code');
	data.append('redirect_uri', spClientCallback);
	data.append('code', req.body.code);

	// get tokens from spotify api
	const result = await fetch(spotifyEndpoint, {
		method: 'POST',
		headers: {
			Authorization: authorizationHeader,
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: data,
	});
	const replyBody = await result.json();

	// encrypt refresh_token
	if (replyBody.refresh_token) {
		replyBody.refresh_token = encrypt(replyBody.refresh_token);
	}

	// send response
	res.send(replyBody);
});

/**
 * Refresh endpoint
 * Uses the refresh token on request body to get a new access token
 */
app.post('/refresh', async (req, res) => {
	if (!req.body.refresh_token) {
		res.status(400).send({error: 'Refresh token is missing from body'});
		return;
	}

	// decrypt token
	const refreshToken = decrypt(req.body.refresh_token);
	// prepare data for request
	const data = new URLSearchParams();
	data.append('grant_type', 'refresh_token');
	data.append('refresh_token', refreshToken);
	// get new token from Spotify API
	const result = await fetch(spotifyEndpoint, {
		method: 'POST',
		headers: {
			Authorization: authorizationHeader,
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: data,
	});
	const replyBody = await result.json();

	// encrypt refresh_token
	if (replyBody.refresh_token) {
		replyBody.refresh_token = encrypt(replyBody.refresh_token);
	}

	// send response
	res.status(res.status).send(replyBody);
});
app.use(bodyParser.urlencoded({extended: true}));

app.listen(port);
console.log("Listening on port ", port);

