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
├── supabase/
│   └── functions/
│       └── send-notification/index.ts # OneSignal + Expo push notification Edge Function
├── assets/                          # İkon, splash vs.
└── src/
    ├── lib/
    │   ├── supabase.ts              # Supabase client (URL + anon key)
    │   ├── auth.tsx                  # AuthContext (signUp, signIn, signOut, resetPassword, user)
    │   ├── theme.tsx                 # ThemeContext (dark/light toggle, AsyncStorage)
    │   └── notifications.ts         # Expo push token + lokal bildiris qurulumu
    ├── constants/
    │   ├── theme.ts                 # Renkler, fontlar
    │   └── filters.ts               # Kamera filter + sticker listesi
    ├── navigation/
    │   ├── AuthNavigator.tsx        # Login/Register/ForgotPassword stack
    │   └── AppNavigator.tsx         # Ana tab navigator (5 tab)
    ├── components/
    │   ├── PostCard.tsx             # Feed post karti (like/comment/repost/bookmark/share/hashtag/mention)
    │   ├── ReelItem.tsx             # Reels video overlay
    │   ├── StoryPreview.tsx         # Feed'de story halkalari
    │   ├── StoryViewer.tsx          # Story izleme (modal, 5s, progress bar)
    │   ├── VerifiedBadge.tsx        # Tesdiqlenmis isare
    │   └── FormInput.tsx            # Giris inputu (tekrar istifade)
    └── screens/
        ├── auth/
        │   ├── LoginScreen.tsx      # Forgot password linki elave edildi
        │   ├── RegisterScreen.tsx
        │   └── ForgotPasswordScreen.tsx # Email ile sifre sifirlama
        ├── feed/
        │   ├── FeedScreen.tsx       # Realtime post akisi + bildiriş zəngi + suggested users
        │   ├── CreatePostScreen.tsx # Post yarat (text + image + hashtag/mention parse)
        │   └── PostDetailScreen.tsx # Post detay + nested commentler + reply + bookmark
        ├── reels/
        │   ├── ReelsScreen.tsx      # Dikey kaydirmali reel (pagingEnabled)
        │   └── CreateReelScreen.tsx # Reel yarat (video picker)
        ├── story/
        │   └── CreateStoryScreen.tsx # Story yarat (kamera/galeri)
        ├── notifications/
        │   └── NotificationsScreen.tsx # In-app bildiriş tarixçəsi
        ├── camera/
        │   └── CameraScreen.tsx     # Snapchat filterli kamera (8 filtre + 12 sticker)
        ├── chat/
        │   ├── ConversationsListScreen.tsx # Mesajlasma listesi + post paylasma
        │   ├── ChatScreen.tsx       # Realtime sohbet
        │   └── NewConversationScreen.tsx   # Yeni mesaj (user search)
        ├── community/
        │   ├── CommunityListScreen.tsx     # Topluluklari gez/kateqor
        │   ├── CommunityDetailScreen.tsx       # Kanal listesi + rol yönetimi + ses username
        │   ├── CreateCommunityScreen.tsx       # Topluluk yarat (#genel + #duyurular)
        │   ├── ChannelChatScreen.tsx           # Kanal sohbeti (filter + slow mode)
        │   ├── ChannelSettingsScreen.tsx       # Ban, yasakli kelime, slow mode, icazeler
        │   ├── VoiceChannelScreen.tsx          # Sesli oda UI (mute, screen share)
        │   ├── RoleManagementScreen.tsx        # Rol yaratma, üyelere rol atama
        │   └── ChannelPermissionsScreen.tsx    # Kanal izinleri (oku/yaz/konuş)
        ├── search/
        │   └── SearchScreen.tsx     # User + hashtag + community axtarisi
        ├── profile/
        │   ├── ProfileScreen.tsx    # Profil (posts, reels, saved posts, verification)
        │   └── EditProfileScreen.tsx # Profil duzenle
        ├── settings/
        │   └── SettingsScreen.tsx   # Tema, bildiriş tercihleri, profili düzəlt, çıxış
        └── admin/
            └── AdminPanelScreen.tsx # Admin panel (user verify/role)
```

---

## 🎯 Tamamlanan Xüsusiyyətlər

### Phase 1 — Auth + Profil ✅
- [x] Supabase auth (email ilə qeydiyyat/giriş)
- [x] AuthContext (signUp, signIn, signOut, resetPassword, loading, user)
- [x] LoginScreen, RegisterScreen, ForgotPasswordScreen (dark tema, gradient)
- [x] ProfileScreen (avatar, bio, post/reel/saved count, verified badge)
- [x] EditProfileScreen (username, full_name, bio, avatar upload)
- [x] AdminPanelScreen (user list → verify/role)
- [x] `handle_new_user` trigger → auto profile row

### Phase 2 — Post Feed ✅
- [x] FeedScreen (FlatList, realtime, pull-refresh, story preview header, notification bell)
- [x] CreatePostScreen (text + image picker + compression + hashtag/mention parse)
- [x] PostDetailScreen (nested comments, reply, like, bookmark, realtime)
- [x] PostCard (like ❤️, comment 💬, repost 🔄, bookmark 🔖, share 📤, share via message ✉️)
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
- [x] ConversationsListScreen (son mesaj preview, realtime, post paylasma)
- [x] ChatScreen (realtime via Supabase Realtime channel)
- [x] NewConversationScreen (user search → direct chat)

### Phase 6 — Communities ✅
- [x] CommunityListScreen (browse, join/leave, kateqoriyalar)
- [x] CommunityDetailScreen (kanal listesi + role management + voice participant usernames)
- [x] CreateCommunityScreen (auto-creates #genel + #duyurular)
- [x] ChannelChatScreen (per-channel realtime chat)

### Phase 7 — Kanal Yönetimi ✅
- [x] `channel_bans` table (user_id, channel_id, reason, expires_at)
- [x] `voice_participants` table (user_id, channel_id, muted, screen_sharing)
- [x] `community_channels` sutunlari: `banned_words[]`, `slow_mode bool`, `slow_mode_interval int`
- [x] ChannelSettingsScreen (yasakli kelimeler, slow mode, kick/ban/unban)
- [x] ChannelChatScreen (ban check, mesaj filter, slow mode throttling)
- [x] VoiceChannelScreen (join/leave, mute/unmute, screen share indicator, participant list)

### Phase 19 — Rol Sistemi & Kanal İcazələri ✅
- [x] `community-audio` Storage bucket (giris/cixis ses faylları)
- [x] VoiceChannelScreen → `expo-av` ilə giriş/çıxış səs effekti (giris_ses.mp3 / cixis_ses.mp3)
- [x] İstifadəçi otağa girəndə/çıxanda avtomatik səs çalınır
- [x] Digər istifadəçilər girəndə/çıxanda da səs eşidilir (realtime) 
- [x] `community_roles` table (community_id, name, color, permissions JSONB)
- [x] `role_assignments` table (user ↔ role many-to-many)
- [x] `channel_permissions` table (role-based can_read/can_write/can_voice)
- [x] `voice_participants` → `screen_sharing` column əlavə edildi
- [x] RoleManagementScreen — rol yaratma, rəng seçimi, üzvlərə rol təyin etmə
- [x] `community_roles` table (community_id, name, color, permissions JSONB)
- [x] `role_assignments` table (user ↔ role many-to-many)
- [x] `channel_permissions` table (role-based can_read/can_write/can_voice)
- [x] `voice_participants` → `screen_sharing` column əlavə edildi
- [x] RoleManagementScreen — rol yaratma, rəng seçimi, üzvlərə rol təyin etmə
- [x] ChannelPermissionsScreen — hər rol üçün oxu/yaz/danış icazə toggle-ları
- [x] CommunityDetailScreen → Rol idarəetmə düyməsi + ses kanalında username göstərilməsi
- [x] ChannelSettingsScreen → İcazə düyməsi (shield icon)
- [x] VoiceChannelScreen → screen_sharing DB-yə yazılır

### Phase 8 — Kamera ✅
- [x] CameraScreen (8 renk filtresi: Warm, Cool, Vintage, Noir, Dramatic, Pastel, Neon)
- [x] 12 emoji sticker overlay (😎🔥❤️💯😂🎉⭐👑🌈🦋🌙⚡)
- [x] Galeriden foto secimi
- [x] Post ve ya Story olaraq paylasma
- [x] Splash screen (app.json)
- [x] Kamera/galeri izinleri (iOS infoPlist)

### Phase 9 — Nested Comments ✅
- [x] `post_comments` tablosuna `parent_id` əlavə edildi
- [x] PostDetailScreen-da ierarxik comment gostərimi (replies indentation)
- [x] Her comment-de "Cavabla" duyməsi
- [x] Cavab yazarkən "kime cavab verdiyini" gosteren indicator

### Phase 10 — Share Posts ✅
- [x] Digər aplikasiyalara paylasma (React Native Share API, 📤)
- [x] Mesaj yolu ilə paylasma (✉️ → conversation seç → post linki mesaj kimi gonderilir)

### Phase 11 — Hashtag / Mention ✅
- [x] `hashtags` tablosu (tag unikal)
- [x] `post_hashtags` junction tablosu
- [x] Post yaradılarkən hashtag-lərin parse edilib bazaya yazılması
- [x] `mentions` tablosu (post_id, user_id)
- [x] Post yaradılarkən mention-ların parse edilib bazaya yazılması
- [x] Hashtag-lərə klik -> SearchScreen-de hemin hashtag postlari gosterilir
- [x] Mention-lara klik -> SearchScreen-de hemin istifadeci axtarisi
- [x] SearchScreen-de "Hashtag" tab-i (post neticeleri ile)

### Phase 12 — Search ✅
- [x] SearchScreen (User + Hashtag + Community axtarisi)
- [x] Debounce (300ms) ile canli axtaris
- [x] User axtarisi (username/full_name ilə ilike)
- [x] Hashtag axtarisi (post neticeleri ile)
- [x] Community axtarisi (name/description ilə ilike)
- [x] Follow/unfollow birbaşa axtaris neticelerinde

### Phase 13 — Post Saves / Bookmark ✅
- [x] `saved_posts` tablosu (user_id, post_id unique)
- [x] PostCard-da bookmark duyməsi (🔖)
- [x] PostDetailScreen-da bookmark duyməsi
- [x] ProfileScreen-de "Saxlanılan" tab-i (yalnız öz profilinde)
- [x] is_saved durumu feed ve post detailde gosterilir

### Phase 14 — Theme (Dark/Light) ✅
- [x] ThemeContext (dark/light toggle, AsyncStorage ile persist)
- [x] SettingsScreen-de tema deyisdirme (🌙/☀️)
- [x] Tam color paleti (dark + light)
- [x] Butun ekranlarda useTheme hook-u ile dinamik renkler

### Phase 15 — Forgot Password ✅
- [x] `resetPasswordForEmail` metodu auth.tsx-de
- [x] ForgotPasswordScreen (email daxil et → link gondər)
- [x] LoginScreen-de "Şifrəni unutdun?" linki
- [x] AuthNavigator-da ForgotPassword route-u

### Phase 16 — Push Notifications ✅
- [x] Expo push token qeydiyyati (profiles.expo_push_token)
- [x] OneSignal Edge Function (`supabase/functions/send-notification/`)
- [x] Edge Function həm OneSignal, həm Expo Push API destekleyir
- [x] Webhook formatinda DB trigger payload-larini qebul edir
- [x] Bildirim tercihlerine gore filtreleme (likes/comments/follows/mentions)
- [x] `notification_preferences` tablosu (likes/comments/follows/mentions/messages)

### Phase 17 — In-App Notifications ✅
- [x] `notifications` tablosu (bildiriş tarixçəsi)
- [x] DB trigger-ları: like, comment, follow, mention → auto notification
- [x] NotificationsScreen (bildiriş tarixçəsi, oxunmuş/oxunmamış)
- [x] FeedScreen-de bildiriş zəngi (🔔) → notifications screen
- [x] Bildirişler oxundu kimi isarelenebilir

### Phase 18 — Notification Preferences ✅
- [x] SettingsScreen-de bildiriş tercihleri (Switch toggles)
- [x] Likes, Comments, Follows, Mentions, Messages
- [x] Varsayılan olaraq hamisi aktiv
- [x] Edge Function tercihleri yoxlayaraq push gonderir

---

## 📊 Veritabanı (Supabase)

### Tables

| Tablo | Aciklama |
|-------|----------|
| `profiles` | id, username, full_name, avatar_url, bio, verified, role, expo_push_token, created_at |
| `posts` | user_id, content, image_url, created_at, updated_at |
| `post_likes` | user_id, post_id (unique) |
| `post_comments` | user_id, post_id, **parent_id (nullable)**, content, created_at |
| `hashtags` | tag (unikal) |
| `post_hashtags` | post_id, hashtag_id (unique) |
| `mentions` | post_id, user_id (unique) |
| `reposts` | user_id, post_id (unique) |
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
| `voice_participants` | channel_id, user_id, is_muted, screen_sharing, joined_at |
| `community_roles` | community_id, name, color, permissions (JSONB) |
| `role_assignments` | community_id, user_id, role_id |
| `channel_permissions` | channel_id, role_id, can_read, can_write, can_voice |
| `saved_posts` | user_id, post_id (unique), created_at |
| `notifications` | user_id, type, title, body, data, read, created_at |
| `notification_preferences` | user_id (unique), likes, comments, follows, mentions, messages |

### Storage Buckets

| Bucket | Aciklama | Access |
|--------|----------|--------|
| `avatars` | Profil fotograflari | Public read, auth upload |
| `post-images` | Post gorselleri | Public read, auth upload |
| `reels` | Reel videolar | Public read, auth upload |
| `stories` | Story medyalari | Public read, auth upload |
| `community-audio` | Ses kanali giris/cixis effektleri | Public read, auth upload |

### RLS Policies

- **profiles**: Public read, self update, admin manage
- **posts**: Public read, auth insert, self update/delete
- **post_likes**: Public read, auth insert/delete (self)
- **post_comments**: Public read, auth insert, self delete
- **hashtags**: Public read, anyone insert
- **post_hashtags**: Public read, post owner insert
- **mentions**: Public read, post owner insert
- **reels/reel_likes/stories/story_views**: Public read, auth insert, self delete
- **conversations/participants/messages**: Participant only
- **communities/members/channels/messages**: Member only
- **channel_bans/voice_participants**: Member read, admin manage
- **saved_posts**: Self view/insert/delete
- **notifications**: Self view/update
- **notification_preferences**: Self view/upsert

---

## 🧩 Konfiqurasiya

### Supabase Baglantisi
```
URL:    https://<your-project>.supabase.co
Anon:   <your-anon-key>
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
4. `supabase-roles.sql`

### Edge Function Deploy
```bash
# Supabase Edge Function-u deploy et
npx supabase functions deploy send-notification

# Environment deyiskenlerini set et
npx supabase secrets set ONE_SIGNAL_APP_ID=your_app_id
npx supabase secrets set ONE_SIGNAL_API_KEY=your_api_key
```

Database Webhook-larini Supabase Dashboard-dan elave edin:
- `post_likes` INSERT → `send-notification` Edge Function
- `post_comments` INSERT → `send-notification` Edge Function
- `follows` INSERT → `send-notification` Edge Function
- `mentions` INSERT → `send-notification` Edge Function

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
| Nested comments (parent_id) | Self-referencing foreign key, flat query + client-side grouping |
| Hashtag/mention parse on create | Post yaradilan anda parse edilib ayrı tablolara yazilir |
| OneSignal + Expo Push dual | OneSignal mövcud deyilse Expo Push fallback |
| DB trigger → notifications | Like/comment/follow/mention-da avtomatik bildiriş yaranır |
| notification_preferences | İstifadəçilər bildiriş növlərini fərdiləşdirə bilir |

---

## ⏳ Gələcək Planlar

### Yaxın
- [ ] Telefon login (OTP)
- [ ] Google login
- [ ] Camera — real-time face detection / face filters (react-native-vision-camera + MLKit)
- [ ] Camera — video kayıt
- [ ] Profil QR kodu
- [ ] Canlı yayın

### Orta Vade
- [ ] WebRTC sesli/görüntülü arama (voice channel)
- [ ] Admin panel → content moderation (post/comment report)
- [ ] Ekran paylaşma sistemi — userlər bir-birinin ekranını görə bilər

### Uzun Vade
- [ ] EAS Build → App Store / Google Play
- [ ] OTA güncelleme (expo-updates)
- [ ] Performance optimization (FlashList, lazy loading)
- [ ] WebRTC sesli danışma sistemi (voice channel voice chat)
- [ ] Ekran paylaşımını canlı izləmə (Discord ekran paylaşma kimi)

---

## 📦 Supabase Yer Tutumu Analizi (Tamamlanan və Gələcək)

| Xüsusiyyət | DB yer tutumu | Storage yer tutumu | Status |
|------------|---------------|-------------------|--------|
| Ses/yazı kanal kateqoriyası | ❌ Cüzi (1 sütun) | ❌ Yox | ✅ Tamamlandı |
| Rol sistemi | ⚠️ Orta (3 yeni cədvəl: `community_roles`, `role_assignments`, `channel_permissions`) | ❌ Yox | ✅ Tamamlandı |
| Kanallara rollərlə giriş | ❌ Cüzi (1-2 sütun) | ❌ Yox | ✅ Tamamlandı |
| Ses kanalında username göstərilməsi | ❌ Cüzi | ❌ Yox | ✅ Tamamlandı |
| Səs effekti (giriş/çıxış) | ❌ Yox | ⚠️ Kiçik (2 audio fayl, ~100KB) | ✅ Tamamlandı |
| Ekran paylaşma | ❌ Yox | ❌ Yox | ⏳ Gələcək (WebRTC) |
| WebRTC səsli danışma | ❌ Yox (yalnız signaling) | ❌ Yox | ⏳ Gələcək |

### Nəticə
- **Storage yer açar**: Yalnız səs effekt faylları (join/leave sound)
- **DB yer açar**: Rol sistemi (3 cədvəl), qalanları cüzi sütun əlavəsi
- **Ekran paylaşma + WebRTC**: Bazada və Storage-də **0 yer tutur** — P2P real-time axındır

---

## 🔗 Link Sistemi (Daha sonra edilecek)

Postlari digər proqramlara paylaşanda `https://ticcer.app/p/{post-id}` formatında link göndərilir. Bu linkin işləməsi üçün:

### Tələb olunanlar

1. **Veb səhifə (landing page)**
   - `ticcer.app` domain-i alınmalı
   - Veb server qurulmalı (Next.js, Vite, və s.)
   - `/p/:id` route-u Supabase-dən post məlumatını çəkib göstərməli
   - Open Graph (OG) meta teqləri olmalı (link paylaşılanda şəkil+başlıq görünsün)

2. **Deep linking (app-i açmaq)**
   - `Expo Linking` konfiqurasiyası (`app.json`-da `scheme`)
   - Universal Links (iOS) / App Links (Android)
   - Veb səhifədən app-ə yönləndirmə

### Alternativ (asan yol)

Firebase Dynamic Links və ya [Branch.io](https://branch.io) istifadə etmək:
- Domain tələb etmir (firebase.page.link işləyir)
- Həm veb səhifə, həm app-i açmağı avtomatik idarə edir
- SDK ilə bir neçə dəqiqəyə qoşulur

---

## ⚠️ Bilinen Problemler / Blockerlar

1. **Node.js v18** — Expo SDK 56 uyumlu deyil, Node >=20.19.4 teleb olunur
2. **Voice Channel audio** — UI hazirdir, amma canli ses ucun WebRTC (react-native-webrtc) elave edilmelidir
3. **Real face filters** — Hazirki renk filtresi + sticker cozumudur; gercek AR effektler ucun `react-native-vision-camera` + Frame Processor teleb olunur
4. **Database Webhooks** — Bildirim Edge Function-u tetiklemek ucun Supabase Dashboard-dan 4 webhook elave edilmelidir (post_likes, post_comments, follows, mentions INSERT)

---

## 📱 Tab Navigasiyasi

```
1. Feed       — Post akisi, story preview, WhatsApp stil bildiriş toast-ı, FAB (+)
2. Axtar      — User, hashtag, community axtarisi
3. Reels      — TikTok stil dikey video
4. Topluluq   — Discord stil kanallar
5. Profil     — Profil, saxlanılan postlar, ayarlar, admin panel
```

### Header Dizaynı
```
[📸 Camera]       Ticcer       [✉️ Messages]
    Sol üst        Orta           Sağ üst
```

## 🆕 27 İyun 2026 — Yeni Əlavə Edilənlər

| # | Dəyişiklik |
|---|------------|
| 1 | **Forgot Password** — `auth.tsx`-ə `resetPasswordForEmail`, `ForgotPasswordScreen`, route, LoginScreen-də "Şifrəni unutdun?" linki |
| 2 | **Post Saves / Bookmark** — `saved_posts` tablosu, PostCard/PostDetail-də 🔖 bookmark, Profile-də "Saxlanılan" tabı |
| 3 | **Notification Preferences** — `notification_preferences` tablosu, SettingsScreen-də Switch toggle-lar (likes/comments/follows/mentions/messages) |
| 4 | **Push Notifications** — Edge Function yeniləndi (OneSignal + Expo Push dual), DB trigger-ları: notify_like, notify_comment, notify_follow, notify_mention |
| 5 | **In-App Notifications** — `notifications` tablosu, `NotificationsScreen`, Feed-də 🔔 zəng ikonu |
| 6 | **Community Search** — SearchScreen-ə "Community" tab-ı əlavə edildi (name/description ilə axtarış) |
| 7 | **Password Visibility Toggle** — FormInput-a göz ikonu əlavə edildi (`👁️`/`👁️‍🗨️`) |
| 8 | **Bugfix: ProfileScreen syntax** — Ternary `? : ? : ?` düzəldi (mediaTab 3 yollu) |
| 9 | **Bugfix: signOut** — `auth.tsx`-də error handling + force state clear (çıxış işləmədi) |
| 10 | **Bugfix: SQL policy** — `notification_preferences`-da duplicate policy adı düzəldi |
| 11 | **Bugfix: post_comments.parent_id** — `ALTER TABLE ADD COLUMN IF NOT EXISTS` əlavə edildi |
| 12 | **Bugfix: ProfileScreen refresh** — `useFocusEffect` + mediaTab dəyişəndə saved posts yenilənir |
| 13 | **Feed yenidən dizayn** — Logo ortalandı, FAB (sağ altda +), WhatsApp stil bildiriş toast-ı, tövsiyələr götürüldü, story📸 sol, message💬 sağ |
| 14 | **Ionicon keçid** — Bütün emoji ikonlar `@expo/vector-icons` (Ionicons) ilə əvəz olundu (16 fayl): header, tab bar, FAB, PostCard, PostDetail, Profile, Settings, Notifications, Search, VoiceChannel, Camera, Community, StoryViewer, VerifiedBadge, CreatePost, CreateReel, ReelItem, FormInput |
