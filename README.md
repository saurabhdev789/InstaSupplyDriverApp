# InstaSupply Driver App

React Native driver app for viewing deliveries, optimized route planning, and push notifications.

## Run the app

1. Install dependencies:

```sh
npm install
```

2. Start Metro:

```sh
npm start
```

3. Run Android:

```sh
npm run android
```

4. Run iOS:

```sh
bundle install
bundle exec pod install
npm run ios
```

## Trigger test push notification

Use the deployed push tester website:

- [https://instasupplydriverapp.vercel.app/](https://instasupplydriverapp.vercel.app/)

Steps:

1. In the mobile app Deliveries screen, tap `Show Push Token`.
2. Copy the token and paste it into `Driver Push Token` on the website.
3. Enter API Key: `insta-push-test`
4. Click `Send Test Delivery Push`.

This creates a test delivery and triggers the app push flow.

## Push tester setup reference

Push tester project and env setup docs:

- [push-tester-web/README.md](push-tester-web/README.md)
