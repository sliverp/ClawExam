import crypto from 'crypto';
import config from './config.js';

export function getBaseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
}

export function buildAvatarUrl(req, uidHash) {
  if (!uidHash) return '';
  return `${getBaseUrl(req)}/static/avatar/${uidHash}?t=${Date.now()}`;
}

export function buildAvatarPath(uidHash) {
  if (!uidHash) return '';
  return `avatars/${uidHash}/current`;
}

export function detectImageMeta(buffer) {
  if (!buffer || buffer.length < 4) return null;
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { contentType: 'image/jpeg', ext: 'jpg' };
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return { contentType: 'image/png', ext: 'png' };
  }
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return { contentType: 'image/gif', ext: 'gif' };
  }
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return { contentType: 'image/webp', ext: 'webp' };
  }
  return null;
}

function safeEncodePath(pathname) {
  return pathname
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/')
    .replace(/%2F/g, '/');
}

function hmacSha1(key, str, encoding = 'hex') {
  return crypto.createHmac('sha1', key).update(str).digest(encoding);
}

function sha1(str, encoding = 'hex') {
  return crypto.createHash('sha1').update(str).digest(encoding);
}

export function buildCosAuthorization(method, urlObj, headers = {}) {
  const secretId = config.cos.secretId;
  const secretKey = config.cos.secretKey;

  if (!secretId || !secretKey) {
    throw new Error('COS_SECRET_ID 或 COS_SECRET_KEY 未配置');
  }

  const now = Math.floor(Date.now() / 1000);
  const signTime = `${now - 60};${now + 600}`;
  const normalizedHeaders = Object.entries(headers)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => [String(key).toLowerCase(), String(value).trim()])
    .sort((a, b) => a[0].localeCompare(b[0]));

  const headerList = normalizedHeaders.map(([key]) => key).join(';');
  const headerString = normalizedHeaders
    .map(([key, value]) => `${encodeURIComponent(key).toLowerCase()}=${encodeURIComponent(value)}`)
    .join('&');

  const queryEntries = Array.from(urlObj.searchParams.entries())
    .map(([key, value]) => [String(key).toLowerCase(), String(value)])
    .sort((a, b) => a[0].localeCompare(b[0]));
  const queryList = queryEntries.map(([key]) => key).join(';');
  const queryString = queryEntries
    .map(([key, value]) => `${encodeURIComponent(key).toLowerCase()}=${encodeURIComponent(value)}`)
    .join('&');

  const httpString = [
    method.toLowerCase(),
    safeEncodePath(urlObj.pathname),
    queryString,
    headerString,
    '',
  ].join('\n');

  const signKey = hmacSha1(secretKey, signTime);
  const stringToSign = `sha1\n${signTime}\n${sha1(httpString)}\n`;
  const signature = hmacSha1(signKey, stringToSign);

  return `q-sign-algorithm=sha1&q-ak=${secretId}&q-sign-time=${signTime}&q-key-time=${signTime}&q-header-list=${headerList}&q-url-param-list=${queryList}&q-signature=${signature}`;
}

export async function uploadAvatarToCos(uidHash, buffer, contentType) {
  const objectKey = `${buildAvatarPath(uidHash)}.${detectImageMeta(buffer)?.ext || 'jpg'}`;
  const url = new URL(`${config.cos.baseUrl.replace(/\/+$/, '')}/${objectKey}`);
  const headers = {
    host: url.host,
    'content-type': contentType,
  };
  const authorization = buildCosAuthorization('PUT', url, headers);

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Host: url.host,
      'Content-Type': contentType,
      Authorization: authorization,
      'Content-Length': String(buffer.length),
    },
    body: buffer,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`COS 上传失败: ${response.status}${body ? ` ${body}` : ''}`);
  }

  return {
    objectKey,
    contentType,
    etag: response.headers.get('etag') || '',
  };
}

export function extractMultipartFile(buffer, contentType) {
  const match = /boundary=([^\s;]+)/i.exec(contentType || '');
  if (!match) return null;
  const boundary = Buffer.from(`--${match[1]}`);
  let searchIndex = 0;

  while (searchIndex < buffer.length) {
    const partStart = buffer.indexOf(boundary, searchIndex);
    if (partStart === -1) break;
    const headerStart = partStart + boundary.length + 2;
    const headerEnd = buffer.indexOf(Buffer.from('\r\n\r\n'), headerStart);
    if (headerEnd === -1) break;

    const headerText = buffer.slice(headerStart, headerEnd).toString('utf8');
    const disposition = /content-disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]*)")?/i.exec(headerText);
    const bodyStart = headerEnd + 4;
    const nextBoundary = buffer.indexOf(boundary, bodyStart);
    if (nextBoundary === -1) break;

    const bodyEnd = nextBoundary - 2;
    if (disposition && disposition[1] === 'file' && disposition[2] !== undefined) {
      return {
        filename: disposition[2],
        buffer: buffer.slice(bodyStart, bodyEnd),
      };
    }
    searchIndex = nextBoundary;
  }

  return null;
}
