# 📱 Ticcer — Social Media App

React Native (Expo SDK 56) + TypeScript + Supabase ilə qurulmuş müasir sosial media platforması.

## ✨ Xüsusiyyətlər

- Post paylaşma (şəkil + mətn)
- Reels (qısa video, TikTok stil)
- Stories (24 saatlıq hekayələr)
- Real-time chat (kanal əsaslı)
- Community/Topluluq sistemi
- Push notifications
- Dark/Light tema
- Supabase auth (email/şifrə)
- Following/Followers sistemi

## 🛠 Texnologiyalar

| Stack | 
|-------|
| React Native 0.85 + Expo SDK 56 |
| TypeScript |
| Supabase (Auth, DB, Storage, Realtime) |
| React Navigation v7 |
| OneSignal (push notification) |

## 📦 Quraşdırma

```bash
# Bağımlılıqları yüklə
npm install

# Expo dev server-i başlat
npx expo start
```

## 🔧 Supabase Konfiqurasiyası

1. **Supabase** hesabı yaradın: https://supabase.com
2. Yeni bir layihə yaradın
3. SQL Editor-da aşağıdakı faylları ardıcıl işlədin:
   - `supabase-migration.sql`
   - `supabase-storage-setup.sql` (əgər mövcud layihəyə əlavə edirsinizsə)
   - `supabase-channels.sql`
4. `src/lib/supabase.ts` faylında öz Supabase URL və anon key-inizi yazın

> **Qeyd:** Supabase anon key client-side istifadə üçün nəzərdə tutulub və RLS (Row Level Security) ilə qorunur.
> Həqiqi təhlükəsizlik Supabase RLS politikalarla təmin edilir.

## 🗄 Migrasiya Sırası

Layihə sıfırdan qurulursa:
1. `supabase-migration.sql` — bütün cədvəllər, RLS, storage bucket-lar, trigger-lər
2. `supabase-channels.sql` — kanal ayarları, ban, voice participant
3. `supabase-storage-setup.sql` — storage policy əlavələri

## 📁 Struktur

```
App.tsx                          # Entry point
src/
├── lib/                         # Supabase client, auth, theme, notifications
├── constants/                   # Theme colors, fonts, filters
├── navigation/                  # AppNavigator, AuthNavigator
├── components/                  # PostCard, ReelItem, StoryPreview, etc.
├── screens/                     # All screens
│   ├── auth/                    # Login, Register
│   ├── feed/                    # Feed, CreatePost, PostDetail
│   ├── reels/                   # Reels, CreateReel
│   ├── story/                   # CreateStory
│   ├── search/                  # Search
│   ├── chat/                    # Chat, ConversationsList, NewConversation
│   ├── community/               # CommunityList, Detail, ChannelChat, VoiceChannel
│   ├── profile/                 # Profile, EditProfile, Settings
│   ├── admin/                   # AdminPanel
│   ├── camera/                  # CameraScreen
│   └── settings/                # SettingsScreen
└── types/                       # TypeScript types
```
