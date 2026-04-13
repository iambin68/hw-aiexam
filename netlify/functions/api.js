const { getStore } = require('@netlify/blobs');

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function blobErr(msg) {
  return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: msg }) };
}

function getConfiguredStore() {
  const siteID = process.env.NETLIFY_SITE_ID || '5e74bd0e-8fe4-41da-8729-5cf4bb327c0e';
  const token  = process.env.NETLIFY_TOKEN;
  if (!token) throw new Error('NETLIFY_TOKEN 環境變數未設定');
  return getStore({ name: 'platform', siteID, token });
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  // ── Blob 儲存操作 ──
  if (['blob_get','blob_set','blob_del','blob_list'].includes(body.action)) {
    let store;
    try { store = getConfiguredStore(); }
    catch(e) { return blobErr(e.message); }

    if (body.action === 'blob_get') {
      try {
        const val = await store.get(body.key);
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ value: val ? JSON.parse(val) : null }) };
      } catch(e) {
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ value: null }) };
      }
    }

    if (body.action === 'blob_set') {
      try {
        await store.set(body.key, JSON.stringify(body.value));
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
      } catch(e) {
        return blobErr('blob_set 失敗：' + e.message);
      }
    }

    if (body.action === 'blob_del') {
      try {
        await store.delete(body.key);
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
      } catch(e) {
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
      }
    }

    if (body.action === 'blob_list') {
      try {
        const result = await store.list({ prefix: body.prefix || '' });
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ keys: result.blobs.map(b => b.key) }) };
      } catch(e) {
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ keys: [] }) };
      }
    }
  }

  // ── Anthropic AI 代理 ──
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: { message: 'API Key 未設定' } })
    };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    return { statusCode: response.status, headers: CORS, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: { message: err.message } }) };
  }
};
