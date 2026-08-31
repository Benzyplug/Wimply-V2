# OPTIONAL - not verified against "DeployHatch" (see chat: that platform
# could not be found/confirmed to exist). This is a generically solid,
# portable multi-stage build for a Node/TypeScript/Prisma Discord bot,
# provided as a fallback in case your host takes a Dockerfile. If your
# platform builds from the repo directly (buildpacks/Nixpacks/etc.) you
# likely don't need this at all - delete it.
#
# Uses Debian "bookworm" (OpenSSL 3.x) as both build and runtime base so the
# engine binary Prisma picks at runtime actually matches what's installed,
# on either x64 or arm64 (Docker builds for whatever host/target arch you
# specify - the extra arm64/openssl1.1 binaryTargets in schema.prisma are
# there as a fallback if your actual host differs from this image).

FROM node:20-bookworm-slim AS build
WORKDIR /app

# openssl is present by default on bookworm, but installed explicitly here
# so the image doesn't silently break if a slimmer base is swapped in later.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

# Generate the client against this stage's own node_modules/pruned deps -
# avoids any mismatch between the build-stage and runtime-stage trees.
RUN npx prisma generate

CMD ["npm", "run", "start"]
