---
title: "[MEDIUM] Add missing env vars to .env.local.example"
labels: enhancement, medium, docs
---

## Problem

`.env.local.example` is missing several environment variables that the code references:

- `ALGOLIA_SEARCH_API_KEY` (used in client-side search)
- `ALGOLIA_INDEX_NAME` (used in indexing)
- `TWILIO_STATUS_CALLBACK_URL` (used in webhook signature validation)
- `MAILGUN_WEBHOOK_SIGNING_KEY` (critical for webhook security — see issue #05)
- `BLOB_READ_WRITE_TOKEN` (needed for Vercel Blob uploads outside Vercel)

## Fix

Add the missing vars to `.env.local.example`:

```bash
# Algolia Search
ALGOLIA_APP_ID=your-algolia-app-id
ALGOLIA_ADMIN_API_KEY=your-algolia-admin-key
ALGOLIA_SEARCH_API_KEY=your-algolia-search-key
ALGOLIA_INDEX_NAME=your-algolia-index-name

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_STATUS_CALLBACK_URL=https://your-domain.com/api/webhooks/twilio

# Mailgun (Email)
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=your-mailgun-domain
MAILGUN_WEBHOOK_SIGNING_KEY=your-mailgun-webhook-signing-key

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=your-blob-token
```

## Verification

1. New developer clones repo → `.env.local.example` has all required vars.
2. No runtime errors from missing env vars when all are set.
