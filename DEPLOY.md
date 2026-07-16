# Deploying BillPad with Docker / OpenShift

## Build the image

```bash
docker build \
  --build-arg VITE_SUPABASE_URL="https://YOUR-PROJECT.supabase.co" \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..." \
  --build-arg VITE_SUPABASE_PROJECT_ID="YOUR-PROJECT" \
  -t billpad:latest .
```

> `VITE_*` values are **baked into the client bundle at build time** — they must be passed as `--build-arg`, not at runtime.

## Run locally

```bash
docker run --rm -p 8080:8080 \
  -e SUPABASE_URL="https://YOUR-PROJECT.supabase.co" \
  -e SUPABASE_PUBLISHABLE_KEY="sb_publishable_..." \
  -e SUPABASE_SERVICE_ROLE_KEY="sb_secret_..." \
  billpad:latest
```

Open http://localhost:8080

## Deploy to OpenShift

1. Push the image to a registry OpenShift can pull from (Quay, Docker Hub, or the internal registry).

   ```bash
   docker tag billpad:latest quay.io/<you>/billpad:latest
   docker push quay.io/<you>/billpad:latest
   ```

   Or build directly on the cluster from your GitHub repo:

   ```bash
   oc new-app --name=billpad \
     --strategy=docker \
     https://github.com/<you>/<repo>.git \
     --build-env VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co \
     --build-env VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_... \
     --build-env VITE_SUPABASE_PROJECT_ID=YOUR-PROJECT
   ```

2. Add the runtime secrets:

   ```bash
   oc create secret generic billpad-env \
     --from-literal=SUPABASE_URL=https://YOUR-PROJECT.supabase.co \
     --from-literal=SUPABASE_PUBLISHABLE_KEY=sb_publishable_... \
     --from-literal=SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
   oc set env deployment/billpad --from=secret/billpad-env
   ```

3. Expose the service:

   ```bash
   oc expose service/billpad
   oc get route billpad   # <- your public URL
   ```

4. In the Supabase / Lovable Cloud auth settings, add the OpenShift route URL to the allowed redirect URLs so Google sign-in works from your deployed domain.

## Notes

- The container listens on `PORT=8080` and binds `0.0.0.0` — matches OpenShift's default expectations.
- Runs as a non-root user (UID 1001) and the app directory is group-writable, which satisfies OpenShift's random-UID policy.
- Only the owner (first Google account to sign in) can access `/app/admin` to approve additional users.
