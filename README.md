# Obi-Uto

A full-stack streaming platform with a Node.js backend, Expo mobile app, and a lightweight web client. The project supports media browsing, playback, favorites, watch history, subscriptions, live streaming, creator features, coin-based rewards, analytics, and notifications.

## Overview

This repository contains three major parts:

- `server/` — Express + MongoDB API for media, auth, uploads, live streaming, subscriptions, wallets, rewards, and analytics.
- `mobile/` — Expo React Native app for iOS/Android and web preview.
- `client/` — React-style frontend shell for browsing media and playback UI.

## Tech Stack

### Backend
- Node.js
- Express
- MongoDB via Mongoose
- Socket.IO
- Node Media Server
- JWT authentication
- Cloudinary integration
- Multer for uploads
- Cron jobs for subscriptions, payouts, recommendations, and notifications

### Mobile App
- Expo
- React Native
- Expo Router
- Zustand state management
- Expo Video
- Push notifications
- Async storage and network monitoring support

### Client UI
- React Native / web-style component structure
- Media cards, rows, and player UI

## Main Features

- User authentication and profile flow
- Browse home media feeds and recommendations
- Play and track video content
- Save favorites and watch history
- Creator uploads and creator dashboards
- Live streaming and live chat
- Coin wallet, rewards, and referral system
- Donations and gifting system
- Subscription plans and premium access
- Admin dashboard / analytics endpoints
- Push notification support
- AI recommendation and trending logic

## Repository Structure

```text
obi-uto/
├── README.md
├── package.json
├── project-structure.txt
├── client/
│   ├── api/
│   ├── assets/
│   ├── components/
│   ├── downloads/
│   ├── hooks/
│   ├── navigation/
│   ├── player/
│   ├── screens/
│   ├── services/
│   ├── store/
│   └── theme/
├── mobile/
│   ├── app.json
│   ├── App.tsx
│   ├── package.json
│   ├── README.md
│   ├── src/
│   ├── assets/
│   ├── scripts/
│   └── tsconfig.json
└── server/
    ├── Dockerfile
    ├── docker-compose.yml
    ├── package.json
    ├── media/
    └── src/
        ├── analytics/
        ├── auth/
        ├── config/
        ├── controllers/
        ├── downloads/
        ├── jobs/
        ├── middleware/
        ├── models/
        ├── routes/
        ├── services/
        ├── socket.js
        ├── streaming/
        ├── uploads/
        ├── utils/
        ├── websocket/
        └── index.js
```

## Prerequisites

Before starting the app, install the following:

- Node.js 18+
- npm or yarn
- MongoDB instance
- Android Studio / Xcode if you plan to run the mobile app on device simulators
- Optional: Docker for containerized backend setup

## Environment Setup

### Server

Create a `.env` file inside `server/` with values similar to:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/obi-uto
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Mobile App

The Expo app may require a backend URL configured in its API client files. Check the files under `mobile/src/api/` and update the base host if needed.

## Running the Project

### 1) Install dependencies

```bash
# root
npm install

# backend
cd server
npm install

# mobile
cd mobile
npm install
```

### 2) Start the backend

```bash
cd server
npm run dev
```

The server runs on port 5000 by default.

### 3) Start the mobile app

```bash
cd mobile
npm start
```

Then choose one of the following:

- `a` for Android
- `i` for iOS
- `w` for web

### 4) Start the web client

The client folder appears to be a separate frontend shell and may require its own setup depending on the intended environment. Review the package files inside `client/` before use.

## Useful Backend Scripts

Inside `server/package.json`:

```bash
npm run dev      # run Express app with nodemon
npm run start    # start the app normally
npm run seed     # seed media data
npm run seed-plans # seed subscription plans
```

## Useful Mobile Scripts

Inside `mobile/package.json`:

```bash
npm start
npm run android
npm run ios
npm run web
npm run lint
```

## Notes

- The backend initializes streaming services and background jobs on startup.
- The app includes live stream and notification integrations using Socket.IO and Expo notifications.
- Some modules are production-oriented and may require additional env values or cloud service credentials.
- The project is structured for extensibility around creator features, monetization, and media distribution.

## Development Notes

This codebase is a feature-rich media platform in active development. Some areas may rely on external services such as:

- MongoDB
- Cloudinary
- Firebase/notification infrastructure
- Live streaming media backend

If you are setting up the project from scratch, make sure all required environment variables are configured before launching the app.

## License

This repository currently does not declare a root-level license in the top-level package metadata. Check individual package folders for app-specific licensing if relevant.

## Contributing

1. Clone the repository.
2. Create a feature branch.
3. Set up environment variables for the backend and mobile app.
4. Run the backend and mobile app locally.
5. Submit a clean pull request with tested changes.

## Summary

This project is a media platform with streaming, subscriptions, creator tools, live content, and monetization features. The backend is the core system, while the mobile app is the main user-facing experience.
