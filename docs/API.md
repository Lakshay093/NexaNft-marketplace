# REST API guide

**Made by Lakshay Dhiman**

Base URL: `http://localhost:4000/api` in development. Use HTTPS in production. Authenticated requests send `Authorization: Bearer ACCESS_TOKEN`. No endpoint uses client-provided owner IDs.

## Response and errors

```json
{
  "success": true,
  "data": [],
  "message": "Listings retrieved",
  "pagination": { "page": 1, "limit": 20, "total": 24, "pages": 2 }
}
```

```json
{
  "success": false,
  "message": "Only the owner can edit this listing",
  "code": "FORBIDDEN",
  "requestId": "REQUEST_ID"
}
```

Validation adds `errors` keyed by field. Common statuses are 400 validation/upload, 401 authentication/session, 403 authorization/origin, 404 missing record, 409 uniqueness/concurrent change, 429 rate limit, and generic 500. Request IDs allow correlation without revealing internals.

## Authentication

| Method/path                  | Input                                                          | Result                                          |
| ---------------------------- | -------------------------------------------------------------- | ----------------------------------------------- |
| POST `/auth/register`        | `fullName`, `username`, `email`, `password`, `confirmPassword` | 201 user, access token, refresh token           |
| POST `/auth/login`           | `email`, `password`                                            | Session                                         |
| POST `/auth/refresh`         | `refreshToken`                                                 | Rotated session                                 |
| POST `/auth/logout`          | `refreshToken`                                                 | Revokes the matching refresh family; idempotent |
| GET `/auth/me`               | Bearer access token                                            | Current user, including their email             |
| POST `/auth/forgot-password` | `email`                                                        | Generic response whether account exists or not  |
| POST `/auth/reset-password`  | `token`, `password`                                            | Consumes recovery link, revokes all sessions    |

Access tokens last 15 minutes. Refresh tokens are 96-character lowercase hex; recovery tokens are 64-character hex. Never include these in logs, issue reports, or query strings except the private email recovery link. Username length is 3–24 ASCII letters/numbers/underscores, normalized to lowercase.

## Marketplace query

`GET /nfts` and `GET /search` accept:

| Parameter              | Values                                                                 |
| ---------------------- | ---------------------------------------------------------------------- |
| `q`                    | Up to 100 characters; artwork, creator, collection, category substring |
| `category`             | Art, Photography, Music, Gaming, Collectibles, Virtual Worlds          |
| `status`               | LISTED, SOLD, UNLISTED; omission returns all visible statuses          |
| `minPrice`, `maxPrice` | Decimal strings with up to six fraction digits                         |
| `sort`                 | newest (default), oldest, price_asc, price_desc, popular               |
| `page`, `limit`        | Page >= 1, limit 1–50 (default 20); maximum page 10000                 |

Example: `/search?q=chromatic&category=Art&minPrice=0.1&maxPrice=3&sort=price_asc&page=1&limit=20`.

NFT records include creator/owner public profiles, collection, precise string price, currency, category, status, favorite count, view count, dates, and the caller’s `isFavorited`. Private user fields are excluded. Detail retrieval increments views. Soft-deleted listings are excluded from all listing feeds and detail routes.

## Artwork and upload flow

1. `POST /uploads` with Bearer auth and multipart fields `purpose=nft` and `image=FILE`.
2. Use returned `{ id, url, size }` in `POST /nfts`:

```json
{
  "name": "My artwork",
  "description": "The story behind my original artwork.",
  "assetId": "UPLOAD_UUID",
  "price": "1.25",
  "category": "Art",
  "collectionId": null
}
```

The upload must belong to the caller with purpose `nft`. Formats: JPEG, PNG, WebP; maximum input 8 MB, 32 million pixels, one frame. Output is an oriented/resized WebP without metadata. The server assigns creator and owner.

| Method/path                    | Policy                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| GET `/nfts/:id`                | Public; optionally personalized favorite state                                        |
| POST `/nfts`                   | Signed-in user with validated upload                                                  |
| PATCH `/nfts/:id`              | Current owner; name/description/price/category/collectionId/status LISTED or UNLISTED |
| DELETE `/nfts/:id`             | Current owner; soft-removes listing                                                   |
| POST `/nfts/:id/favorite`      | Signed-in caller; duplicate calls are idempotent                                      |
| DELETE `/nfts/:id/favorite`    | Signed-in caller; idempotent                                                          |
| POST `/nfts/:id/demo-transfer` | Feature flag enabled, non-owner, LISTED record, `{ "acknowledgeDemo": true }`         |

The demo transfer is an atomic platform-record operation. It charges nothing and creates no blockchain transaction. Competing acquisitions return one success and one 409. SOLD records can be relisted by their new owner.

## Users and collections

| Method/path                 | Behavior                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------- |
| GET `/users/:id`            | Public profile plus created/owned/favorite counts, no email/hash                    |
| PATCH `/users/:id`          | Caller’s own profile; fullName/username/bio/avatarAssetId                           |
| GET `/users/:id/nfts`       | Public paginated feed; `mode=created` (default) or `owned` plus marketplace filters |
| GET `/users/:id/favorites`  | Only the account itself; paginated                                                  |
| GET `/creators`             | Paginated creators ranked by number of visible created works                        |
| GET `/collections`          | Paginated collections with creator and visible artwork count                        |
| GET `/collections/:id`      | Collection detail                                                                   |
| GET `/collections/:id/nfts` | Paginated listing feed with marketplace filters                                     |
| POST `/collections`         | Signed-in creator; name, description, assetId uploaded with purpose `collection`    |

Avatar images must be uploaded with purpose `avatar`. A caller may attach artwork to their own collection. Unchanged original collection membership is retained when a new owner edits an acquired record.

## Activity and notifications

`GET /activity` returns paginated visible listing events: CREATED, UPDATED, UNLISTED, TRANSFERRED. TRANSFERRED means an acknowledged demo transfer. Activity for removed listings remains in persistence but is excluded from the public feed.

`GET /notifications` requires auth and only returns the caller’s inbox. `PATCH /notifications/:id/read` can mark only the caller’s notification; unknown/foreign records return 404. `PATCH /notifications/read-all` marks their own inbox. Both feed endpoints accept page/limit.

## Rate and authorization boundaries

The API-wide limit is 300 requests/minute per IP; auth is 30 attempts/15 minutes; uploads are 30/hour. Default MemoryStore is per process. Configure a shared store before deploying several replicas. CORS restricts browser origins; it does not replace JWT or ownership checks. Native requests may have no Origin header.

Collection feeds additionally accept creatorId=UUID for creator-scoped pagination in listing forms.
