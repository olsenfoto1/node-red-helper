# Network lookup attempt for Action node docs

Tried to confirm Action node configuration details via Node-RED Home Assistant docs, but outbound HTTP requests returned 403.

```
curl -I https://example.com
curl -I https://zachowj.github.io/node-red-contrib-home-assistant-websocket/node/action.html
```

Both commands returned `HTTP/1.1 403 Forbidden` with `curl: (56) CONNECT tunnel failed`.

## Screenshot attempt

Tried to capture a UI screenshot via Playwright against the local `http.server`, but the run timed out before locating the recipe button.
