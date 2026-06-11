# 🔒 SecureChat

SecureChat is a real-time messaging application built with React Native and Supabase, designed to provide secure and seamless communication across mobile devices. The app supports private and group conversations, real-time message delivery, image sharing, and user authentication while maintaining a scalable and production-ready architecture.

## ✨ Features

- 🔐 Email & Password Authentication
- 💬 One-to-One Messaging
- 👥 Group Chats
- ⚡ Real-Time Message Synchronization
- 🟢 Online Status & Last Seen Tracking
- 🖼️ Image Sharing with Cloud Storage
- 🔄 Persistent User Sessions
- 📱 Cross-Platform Support (Android & iOS)
- 🛡️ Row Level Security (RLS)
- 🔒 End-to-End Encryption Ready Architecture

---

## 🏗️ Tech Stack

### Frontend
- React Native
- Expo
- JavaScript
- React Navigation

### Backend
- Supabase Auth
- Supabase Database (PostgreSQL)
- Supabase Realtime
- Supabase Storage

### Local Storage
- AsyncStorage

---

## 📂 Project Structure

```text
SecureChat/
│
├── assets/
│
├── src/
│   ├── components/
│   ├── config/
│   │   └── supabase.js
│   ├── navigation/
│   ├── screens/
│   ├── services/
│   ├── hooks/
│   └── utils/
│
├── App.js
├── package.json
└── README.md
```

---

## 🗄️ Database Schema

### profiles
Stores user information and activity status.

| Column | Type |
|----------|----------|
| id | UUID |
| username | TEXT |
| avatar_url | TEXT |
| online | BOOLEAN |
| last_seen | TIMESTAMP |

### conversations
Stores chat conversations.

| Column | Type |
|----------|----------|
| id | UUID |
| name | TEXT |
| is_group | BOOLEAN |
| created_at | TIMESTAMP |

### participants
Maps users to conversations.

| Column | Type |
|----------|----------|
| conversation_id | UUID |
| user_id | UUID |

### messages
Stores all chat messages.

| Column | Type |
|----------|----------|
| id | UUID |
| conversation_id | UUID |
| sender_id | UUID |
| content | TEXT |
| image_url | TEXT |
| created_at | TIMESTAMP |

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/SecureChat.git
cd SecureChat
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Install Required Packages

```bash
npm install @supabase/supabase-js
npm install @react-native-async-storage/async-storage

npm install @react-navigation/native-stack

npx expo install react-native-screens
npx expo install react-native-safe-area-context
npx expo install react-native-gesture-handler
npx expo install react-native-reanimated
```

---

## ⚙️ Supabase Configuration

Create:

```text
src/config/supabase.js
```

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

Create a `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```
Copy .env.example and rename it to .env


 Add your Supabase credentials

EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key


---

## ▶️ Running the App

Start the Expo development server:

```bash
npx expo start
```

Run on Android:

```bash
a
```

Run on iOS:

```bash
i
```

---

## 🔐 Security Features

- Secure authentication using Supabase Auth
- Persistent session management
- Protected database access using Row Level Security (RLS)
- Secure cloud-based image storage
- Real-time communication with authenticated users
- End-to-end encryption integration planned

---

## 📈 Future Enhancements

- ✅ Read Receipts
- ✅ Push Notifications
- ✅ Voice Messages
- ✅ Video Calling
- ✅ Message Reactions
- ✅ Message Editing & Deletion
- ✅ End-to-End Encryption
- ✅ User Blocking & Reporting
- ✅ Chat Backup & Restore

---

## 🎯 Learning Outcomes

This project demonstrates:

- Mobile App Development with React Native
- Backend-as-a-Service using Supabase
- Authentication & Authorization
- Real-Time Systems
- Database Design & Relationships
- Cloud Storage Integration
- Secure Application Development
- Scalable Application Architecture

---

## 👨‍💻 Author

**Pushkar**

A full-stack mobile application project focused on building a secure, scalable, and production-ready real-time messaging platform using React Native and Supabase.

---

⭐ If you found this project useful, consider giving it a star.
