# Solar Studio repository guidance

- After completing and validating a user-requested change, commit only the files that belong to that request and push the commit to `origin/main` automatically. The repository owner has explicitly authorized this synchronization workflow.
- Run the relevant tests and production build before syncing. Do not commit or push incomplete work or changes that fail validation.
- Never force-push. If the remote branch has diverged or a push would overwrite someone else's work, stop and report the conflict instead.
- Keep the live SQLite database and all local credentials private. Never commit `data/`, `.env.local`, passcodes, secrets, logs, `node_modules/`, `.next/`, or generated TypeScript build metadata.
- Preserve unrelated user changes and stage files explicitly when the working tree contains mixed work.
