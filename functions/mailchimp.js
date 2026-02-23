const crypto = require("crypto");
const fetch = require("node-fetch");
const functions = require("firebase-functions");

function cfg() {
  const mc = functions.config().mailchimp || {};
  const key = mc.key;
  const dc = mc.dc;
  const audience = mc.audience;

  if (!key) throw new Error("Missing functions config: mailchimp.key");
  if (!dc) throw new Error("Missing functions config: mailchimp.dc");
  if (!audience) throw new Error("Missing functions config: mailchimp.audience");

  return { key, dc, audience };
}

function hashEmail(email) {
  return crypto.createHash("md5").update(String(email).toLowerCase()).digest("hex");
}

async function upsertSubscriber({ email, mergeFields = {}, tags = [] }) {
  const { key, dc, audience } = cfg();
  const baseUrl = `https://${dc}.api.mailchimp.com/3.0`;
  const emailHash = hashEmail(email);

  const resp = await fetch(`${baseUrl}/lists/${audience}/members/${emailHash}`, {
    method: "PUT",
    headers: {
      Authorization: `apikey ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      email_address: email,
      status_if_new: "subscribed",
      status: "subscribed",
      merge_fields: mergeFields,
      tags,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Mailchimp API error (${resp.status}): ${text}`);
  }

  return true;
}

module.exports = { upsertSubscriber };
