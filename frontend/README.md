# StoryBridge Frontend - TPRS Educational Stories PWA

This is the frontend for StoryBridge, a mobile-first, offline-capable Progressive Web App delivering TPRS-based educational stories for children aged 4–10 in low-connectivity environments.

## 🚀 Quick Start

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app) and enhanced with PWA capabilities.

## 📱 Mobile-First Architecture

The frontend is optimized for mobile devices with:
- Touch-friendly interface design
- Responsive layout for all screen sizes  
- Offline-first architecture with IndexedDB
- Service Worker for caching and background sync
- PWA installation capabilities

## 🎭 Role-Based Interface

StoryBridge supports four distinct user roles:
- **End Users (Children 4-10)**: Simplified, audio-guided interface
- **Creators**: Story creation and management tools
- **Narrators**: Audio recording and editing capabilities  
- **Administrators**: Platform management and analytics dashboards

## Available Scripts

In the project directory, you can run:

### `yarn start`

Runs the app in development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `yarn build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and includes PWA features for offline functionality.

### `yarn test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

## 🔧 Key Technologies

- **React 19**: Latest React with enhanced performance
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Radix UI**: Accessible component primitives
- **Framer Motion**: Smooth animations and transitions
- **i18next**: Internationalization with Arabic/RTL support
- **IndexedDB**: Local storage for offline functionality
- **Service Worker**: Background sync and caching

## 📦 PWA Features

- **Service Worker**: Advanced caching strategies for offline use
- **Web App Manifest**: Native app-like installation
- **Background Sync**: Automatic data synchronization
- **Push Notifications**: Educational engagement reminders
- **Offline Indicators**: Clear connection status

## 🌐 TPRS Integration

The interface implements TPRS methodology with:
- **Comprehension Checkpoints**: Embedded quiz validation
- **Vocabulary Reinforcement**: Context-based word learning
- **Progress Tracking**: Detailed learning analytics
- **Audio-Text Sync**: Synchronized narration highlighting

## 🔄 Offline Functionality

Complete offline support including:
- **Story Caching**: Download stories for offline reading
- **Progress Sync**: Local progress tracking with cloud sync
- **Queued Actions**: Background synchronization when online
- **Data Management**: Efficient local storage optimization

Learn more about PWA development: [PWA Documentation](https://web.dev/progressive-web-apps/)
