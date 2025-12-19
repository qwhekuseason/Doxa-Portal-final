# Agora Token Server

Local Node.js server for generating Agora RTC tokens.

## Quick Start

```bash
cd token-server
npm install
npm start
```

Server will run on http://localhost:3001

## Endpoint

**POST** `/generateToken`

Request body:
```json
{
  "channelName": "test-channel",
  "uid": 12345,
  "role": "publisher"
}
```

Response:
```json
{
  "token": "...",
  "appId": "...",
  "expiresAt": 1234567890,
  "channel": "test-channel",
  "uid": 12345
}
```
