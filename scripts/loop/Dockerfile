# Rung 3 sandbox image (Phase INFRA T5, ADR-0005).
# PINNED exact tags (anti-rug-pull). v1.61.1-noble verified current at T5
# (2026-07-10) — C.1's @playwright/test devDep MUST match this version.
# The Windows working copy is NEVER mounted: entry.sh clones fresh from GitHub
# each iteration, so disk state lives only in committed PROGRESS.md (Ralph contract).
FROM mcr.microsoft.com/playwright:v1.61.1-noble

# git ships in the base image; gh needs GitHub's apt repo
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl gnupg git \
  && mkdir -p -m 755 /etc/apt/keyrings \
  && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
       -o /etc/apt/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
       > /etc/apt/sources.list.d/github-cli.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends gh \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g @anthropic-ai/claude-code@2.1.206

COPY entry.sh /entry.sh
RUN chmod +x /entry.sh

# claude refuses --dangerously-skip-permissions as root (found by T7 smoke);
# run iterations as the image's non-root pwuser with a pre-owned workdir
RUN mkdir -p /work && chown pwuser:pwuser /work
USER pwuser
