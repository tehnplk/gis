## Rule
- Don't   run  test  or build if user not request.

## Tool
- use `db-cli --help` to manipulate database.
- read database credential from @.env .

## Testing
- Use `playwright-cli` skill to test this repo
- After open url always run `playwright-cli show` for show your test action to user.

## SSH
- Shell นี้ไม่มี interactive `ssh` — ให้ใช้ `plink` และ pipe `y` เพื่อ auto-accept host key:

```bash
echo y | plink -ssh -P <port> -pw '<pwd>' <user>@<host> '<command>'
```

- Production host (credential อยู่ใน @docs/DEPLOY.md):
- Session ไม่ persistent — ต้องต่อคำสั่งด้วย `&&` ภายใน quote เดียวกัน
- ครอบ password ด้วย single quote เสมอ (มีอักขระ `@`)
- `sudo` ใช้ password เดียวกับ user: `echo 'Plkhe@lth00051' | sudo -S <command>`

## Deploy
- read @docs/DEPLOY.md

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
