#!/usr/bin/env bash
# Deploy one Vercel project from this repository, without VERCEL_ORG_ID.
#
# The Vercel CLI refuses to work unlinked, and linking normally wants an org id
# alongside the project id. For a personal Vercel account the org id *is* the
# account id, and the token already identifies the account — so `GET /v2/user`
# hands it over and nobody has to copy it out of the dashboard by hand.
#
# Usage: vercel-deploy.sh <project-id> <label>
set -euo pipefail

project_id="${1:?project id required}"
label="${2:?label required}"

if [ -z "${VERCEL_TOKEN:-}" ]; then
  echo "::error::VERCEL_TOKEN is empty. Check the repository secret exists and is named exactly VERCEL_TOKEN."
  exit 1
fi

if [ -z "$project_id" ]; then
  echo "::error::No project id for $label. Check the repository secrets VERCEL_PROJECT_ID_FRONTEND and VERCEL_PROJECT_ID_BACKEND."
  exit 1
fi

echo "::group::Resolving account id for $label"
# `-f` so a 401 is a failure here rather than a confusing CLI error later.
user_json="$(curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" https://api.vercel.com/v2/user)"
org_id="$(printf '%s' "$user_json" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const u=JSON.parse(s).user;if(!u||!u.id){console.error("no user.id in /v2/user response");process.exit(1)}process.stdout.write(u.id)})')"
echo "account resolved (id hidden), deploying $label"
echo "::endgroup::"

# A stale link from the previous project in this job would silently deploy the
# wrong thing, so start from nothing every time.
rm -rf .vercel

export VERCEL_ORG_ID="$org_id"
export VERCEL_PROJECT_ID="$project_id"

echo "::group::vercel pull ($label)"
# Brings down the project's settings *and* its environment variables, which is
# why the build does not need frontend/.env.local — that file is not in the repo.
npx --yes vercel@latest pull --yes --environment=production --token="$VERCEL_TOKEN"
echo "::endgroup::"

echo "::group::vercel build ($label)"
npx --yes vercel@latest build --prod --token="$VERCEL_TOKEN"
echo "::endgroup::"

echo "::group::vercel deploy ($label)"
url="$(npx --yes vercel@latest deploy --prebuilt --prod --token="$VERCEL_TOKEN")"
echo "::endgroup::"

echo "$label deployed: $url"
echo "- **$label**: $url" >> "$GITHUB_STEP_SUMMARY"
