# Ticcer — Sosial Media App

> React Native (Expo SDK 56) + TypeScript + Supabase (auth, DB, storage, realtime)

---

## 📁 Proje Strukturu

```
sosial-media-app/
├── App.tsx                          # Entry point (AuthProvider + NotificationsGate)
├── app.json                         # Expo konfiqurasiya (splash, plugins, izinler)
├── babel.config.js                  # Reanimated plugin
├── supabase-migration.sql           # Ana SQL migration (cetveller, RLS, storage, trigger)
├── supabase-storage-setup.sql       # Storage policy elaveleri (var olan proyektler ucun)
├── supabase-channels.sql            # Kanal ayarlari + ban + voice participant
├── assets/                          # İkon, splash vs.
└── src/
    ├── lib/
    │   ├── supabase.ts              # Supabase client (URL + anon key)
    │   ├── auth.tsx                  # AuthContext (signUp, signIn, signOut, user)
    │   └── notifications.ts         # Expo push token + lokal bildiris qurulumu
    ├── constants/
    │   ├── theme.ts                 # Renkler, fontlar
    │   └── filters.ts               # Kamera filter + sticker listesi
    ├── navigation/
    │   ├── AuthNavigator.tsx        # Login/Register stack
    │   └── AppNavigator.tsx         # Ana tab navigator (7 tab)
    ├── components/
    │   ├── PostCard.tsx             # Feed post karti (like/comment/repost)
    │   ├── ReelItem.tsx             # Reels video overlay
    │   ├── StoryPreview.tsx         # Feed'de story halkalari
    │   ├── StoryViewer.tsx          # Story izleme (modal, 5s, progress bar)
    │   ├── VerifiedBadge.tsx        # Tesdiqlenmis isare
    │   └── FormInput.tsx            # Giris inputu (tekrar istifade)
    └── screens/
        ├── auth/
        │   ├── LoginScreen.tsx
        │   └── RegisterScreen.tsx
        ├── feed/
        │   ├── FeedScreen.tsx       # Realtime post akisi (FlatList + pull refresh)
        │   ├── CreatePostScreen.tsx # Post yarat (text + image)
        │   └── PostDetailScreen.tsx # Post detay + commentler
        ├── reels/
        │   ├── ReelsScreen.tsx      # Dikey kaydirmali reel (pagingEnabled)
        │   └── CreateReelScreen.tsx # Reel yarat (video picker)
        ├── story/
        │   ├── CreateStoryScreen.tsx # Story yarat (kamera/galeri)
        │   └── StoryViewerModal.tsx
        ├── camera/
        │   └── CameraScreen.tsx     # Snapchat filterli kamera (8 filtre + 12 sticker)
        ├── chat/
        │   ├── ConversationsListScreen.tsx # Mesajlasma listesi
        │   ├── ChatScreen.tsx       # Realtime sohbet
        │   └── NewConversationScreen.tsx   # Yeni mesaj (user search)
        ├── community/
        │   ├── CommunityListScreen.tsx     # Topluluklari gez/kateqor
        │   ├── CommunityDetailScreen.tsx   # Kanal listesi (#text + 🎤voice)
        │   ├── CreateCommunityScreen.tsx   # Topluluk yarat (#genel + #duyurular)
        │   ├── ChannelChatScreen.tsx       # Kanal sohbeti (filter + slow mode)
        │   ├── ChannelSettingsScreen.tsx   # Ban, yasakli kelime, slow mode
        │   └── VoiceChannelScreen.tsx      # Sesli oda UI (mute, screen share)
        ├── profile/
        │   ├── ProfileScreen.tsx    # Profil (posts, verifications)
        │   └── EditProfileScreen.tsx # Profil duzenle
        └── admin/
            └── AdminPanelScreen.tsx # Admin panel (user verify/role)
```

---

## 🎯 Tamamlanan Xüsusiyyətlər

### Phase 1 — Auth + Profil ✅
- [x] Supabase auth (email ilə qeydiyyat/giriş)
- [x] AuthContext (signUp, signIn, signOut, loading, user)
- [x] LoginScreen, RegisterScreen (dark tema, gradient)
- [x] ProfileScreen (avatar, bio, post count, verified badge)
- [x] EditProfileScreen (username, full_name, bio, avatar upload)
- [x] AdminPanelScreen (user list → verify/role)
- [x] `handle_new_user` trigger → auto profile row

### Phase 2 — Post Feed ✅
- [x] FeedScreen (FlatList, realtime, pull-refresh, story preview header)
- [x] CreatePostScreen (text + image picker + compression)
- [x] PostDetailScreen (comments, like, realtime)
- [x] PostCard (like ❤️, comment 💬, repost 🔄)
- [x] Image upload → `post-images` bucket (800px, 70%)

### Phase 3 — Reels ✅
- [x] ReelsScreen (vertical swipe, `pagingEnabled`, auto play/pause on scroll)
- [x] CreateReelScreen (video picker, upload to `reels` bucket)
- [x] ReelItem (like, comment, user info overlay)

### Phase 4 — Stories ✅
- [x] StoryPreview (Feed basliginda horizontal halkalar)
- [x] StoryViewer (modal, 5sn auto-advance, tap left/right navigation, progress bars)
- [x] CreateStoryScreen (camera/gallery, 24h expiry)
- [x] Yalniz 24 saat erzinde olan storyler gosterilir

### Phase 5 — Messaging ✅
- [x] ConversationsListScreen (son mesaj preview, realtime)
- [x] ChatScreen (realtime via Supabase Realtime channel)
- [x] NewConversationScreen (user search → direct chat)

### Phase 6 — Communities ✅
- [x] CommunityListScreen (browse, join/leave, kateqoriyalar)
- [x] CommunityDetailScreen (kanal listesi + admin panel)
- [x] CreateCommunityScreen (auto-creates #genel + #duyurular)
- [x] ChannelChatScreen (per-channel realtime chat)

### Phase 7 — Kanal Yönetimi ✅
- [x] `channel_bans` table (user_id, channel_id, reason, expires_at)
- [x] `voice_participants` table (user_id, channel_id, muted, screen_sharing)
- [x] `community_channels` sutunlari: `banned_words[]`, `slow_mode bool`, `slow_mode_interval int`
- [x] ChannelSettingsScreen (yasakli kelimeler, slow mode, kick/ban/unban)
- [x] ChannelChatScreen (ban check, mesaj filter, slow mode throttling)
- [x] VoiceChannelScreen (join/leave, mute/unmute, screen share indicator, participant list)

### Phase 8 — Kamera + Bildirimler ✅
- [x] CameraScreen (8 renk filtresi: Warm, Cool, Vintage, Noir, Dramatic, Pastel, Neon)
- [x] 12 emoji sticker overlay (😎🔥❤️💯😂🎉⭐👑🌈🦋🌙⚡)
- [x] Galeriden foto secimi
- [x] Post ve ya Story olaraq paylasma
- [x] Expo Push Token qeydiyyati (bildirimler ucun)
- [x] Lokal bildirim gonderimi
- [x] Splash screen (app.json)
- [x] Kamera/galeri izinleri (iOS infoPlist)
- [x] Kamera tab navigasiyaya elave edildi

---

## 📊 Veritabanı (Supabase)

### Tables

| Tablo | Aciklama |
|-------|----------|
| `profiles` | id, username, full_name, avatar_url, bio, verified, role, expo_push_token, created_at |
| `posts` | user_id, content, image_url, created_at, updated_at |
| `post_likes` | user_id, post_id (unique) |
| `comments` | user_id, post_id, content, created_at |
| `reels` | user_id, video_url, description, likes_count, created_at |
| `reel_likes` | user_id, reel_id (unique) |
| `stories` | user_id, media_url, type, expires_at, created_at |
| `story_views` | user_id, story_id, viewed_at |
| `conversations` | id, created_at |
| `conversation_participants` | conversation_id, user_id |
| `messages` | conversation_id, user_id, content, created_at |
| `communities` | id, name, description, avatar_url, category, member_count, verified, created_at |
| `community_members` | community_id, user_id, role, joined_at |
| `community_channels` | id, community_id, name, type, banned_words[], slow_mode, slow_mode_interval, created_at |
| `channel_messages` | channel_id, user_id, content, created_at |
| `channel_bans` | channel_id, user_id, reason, expires_at, banned_at |
| `voice_participants` | channel_id, user_id, muted, screen_sharing, joined_at |

### Storage Buckets

| Bucket | Aciklama | Access |
|--------|----------|--------|
| `avatars` | Profil fotograflari | Public read, auth upload |
| `post-images` | Post gorselleri | Public read, auth upload |
| `reels` | Reel videolar | Public read, auth upload |
| `stories` | Story medyalari | Public read, auth upload |

### RLS Policies

- **profiles**: Public read, self update, admin manage
- **posts**: Public read, auth insert, self update/delete
- **post_likes**: Public read, auth insert/delete (self)
- **comments**: Public read, auth insert, self delete
- **reels/reel_likes/stories/story_views**: Public read, auth insert, self delete
- **conversations/participants/messages**: Participant only
- **communities/members/channels/messages**: Member only
- **channel_bans/voice_participants**: Member read, admin manage

---

## 🧩 Konfiqurasiya

### Supabase Baglantisi
```
URL:    https://wibtcbushwojjzegyppl.supabase.co
Anon:   sb_publishable_pQAY8NGZVX10-5Ps8WiunQ_sn3WlaVE
```

### Calistirma
```bash
# Bagimliliklari yukle
npm install

# Expo dev server
npx expo start

# TypeScript kontrol
npx tsc --noEmit
```

### SQL Migration
Supabase Dashboard → SQL Editor'da sirayla calistir:
1. `supabase-migration.sql`
2. `supabase-storage-setup.sql` (eger mevcud proyekte elave edirsinizse)
3. `supabase-channels.sql`

### Node.js Versiyasi
Expo SDK 56 teleb edir: **Node.js >= 20.19.4**
Hal-hazirda: v18.20.8 — yenilemek ucun:
```bash
nvm install 20
nvm use 20
```

---

## 📝 Qərar Gündəliyi

| Qərar | Səbəb |
|-------|-------|
| Expo managed workflow | Native build tələb olunmur, OTA yeniləmə |
| TypeScript | Tip təhlükəsizliyi |
| Email-only auth (ilk mərhələ) | Telefon + Google sonra əlavə olunacaq |
| `pagingEnabled` + FlatList (reels) | Gesture alternativindən sadədir |
| Reanimated plugin (babel) | Animasiyalar üçün məcburi |
| DROP POLICY IF EXISTS | SQL idempotent təkrar işlətmək üçün |
| Verified badge (manual) | Admin tərəfindən təsdiq |
| Auth trigger → auto profile | Hər yeni istifadəçi üçün profil yaranır |

---

## ⏳ Gələcək Planlar

### Yaxın
- [ ] Camera — real-time face detection / face filters (react-native-vision-camera + MLKit)
- [ ] Camera — video kayıt
- [ ] Reply to comments (nested)
- [ ] Share posts
- [ ] Hashtag / mention (etiketləmə)
- [ ] Bildirim kanalları — push notification server-side (FCM via Supabase Edge Functions)

### Orta Vade
- [ ] Telefon login (OTP)
- [ ] Google login
- [ ] Search (kullanıcı, post, community)
- [ ] Forgot password
- [ ] Post saves / bookmark
- [ ] Dark / light tema toggle
- [ ] Profil QR kodu

### Uzun Vade
- [ ] Canlı yayın
- [ ] WebRTC sesli/görüntülü arama (voice channel)
- [ ] Admin panel → content moderation (post/comment report)
- [ ] Bildirim tercihleri (ayarlar)
- [ ] EAS Build → App Store / Google Play
- [ ] OTA güncelleme (expo-updates)
- [ ] Performance optimization (FlashList, lazy loading)

---

## ⚠️ Bilinen Problemler / Blockerlar

1. **Node.js v18** — Expo SDK 56 uyumlu deyil, Node >=20.19.4 teleb olunur
2. **Voice Channel audio** — UI hazirdir, amma canli ses ucun WebRTC (react-native-webrtc) elave edilmelidir
3. **Push bildirimler** — `expo_push_token` kaydedilir, amma gondermek ucun server-side (Supabase Edge Function) yazilmalidir
4. **Real face filters** — Hazirki renk filtresi + sticker cozumudur; gercek AR effektler ucun `react-native-vision-camera` + Frame Processor teleb olunur

---

## 📱 Tab Navigasiyasi

```
1. 🏠 Feed       — Post akisi, story preview
2. 📷 Kamera     — Snapchat filterli kamera
3. ▶️ Reels      — TikTok stil dikey video
4. 💬 Chat       — Mesajlasma
5. 👥 Topluluq   — Discord stil kanallar
6. 👤 Profil     — Profil, ayarlar, admin panel
```
