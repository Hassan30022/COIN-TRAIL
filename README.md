# Coin Trail

Run `npm install` and `npm start` for local development. The app uses browser storage when Firebase is unconfigured or the user is signed out.

## Enable Google sign-in

1. Register a web app in the [Firebase console](https://console.firebase.google.com/). Copy its Firebase SDK configuration into [firebase.config.ts](src/app/firebase.config.ts).
2. In **Authentication → Sign-in method**, enable **Google** and choose a project support email. In **Authentication → Settings → Authorized domains**, add the hostname where the app runs. For the repository’s GitHub Pages site, use `hassan30022.github.io`. Add `localhost` for local testing. [Firebase Google sign-in guide](https://firebase.google.com/docs/auth/web/google-signin)
3. Create a **Realtime Database** in locked mode and include its exact `databaseURL` in the web app config. Publish [database.rules.json](database.rules.json) in the Realtime Database **Rules** tab before deploying the frontend. The rules scope each ledger to its signed-in Google account. [Firebase Realtime Database setup](https://firebase.google.com/docs/database/web/start)
4. Test with a local entry and a Google account first. Check that the entry appears after sign-in, appears in a second browser signed into the same account, and is absent from a different account. Then run `npm run deploy` from the repo to publish to GitHub Pages.

Keep the same website origin when releasing this update. Existing users should sign in from the browser profile and website they already use. After the cloud write succeeds, Coin Trail removes that guest ledger from the browser. An interrupted import can be retried with the same account. To move data from a different origin or browser profile, use **Export** on the original installation and **Import** on the destination. The manual Import action replaces the ledger currently open, so export a copy of that ledger first if needed.

The Firebase SDK configuration is the public web configuration. Keep service-account credentials and private keys out of the app.
