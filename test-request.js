const http = require('http');

async function run() {
  // Login to get token
  const loginRes = await fetch("http://localhost:3007/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@simpleaccount.com", password: "password" })
  });
  let token = null;
  const loginBody = await loginRes.json();
  if (loginBody.access_token) {
    token = loginBody.access_token;
  } else {
    // maybe we need to create a test user? or there is another endpoint.
    console.log("Login failed", loginBody);
    // let's just make the request without token if we can't get it, or wait...
  }

}
run();
