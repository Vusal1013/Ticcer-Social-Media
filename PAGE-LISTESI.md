# Tüm Sayfalar ve İçerikleri (Detaylı)

---

## 1. FeedScreen (`src/screens/feed/FeedScreen.tsx`)

**State:** `posts`, `loading`, `stories`, `storyIndex`, `storyVisible`, `liveView`, `unreadCount`

**Fonksiyonlar:**
- `fetchFollowingIds()` — takip edilen ID'leri Supabase'den çeker
- `fetchPosts()` — postları çeker, takip edilenleri önce gösterir, diğerlerini 5 ile sınırlar, kaydedilen post durumunu ekler, 30s'de bir interval ile yeniden çeker
- `renderPost` (useCallback) — PostCard'ı render eder, tıklayınca PostDetail'e yönlendirir
- `useFocusEffect` — ekran odaklanınca postları ve bildirim sayısını yeniler; bildirim sayısı 15s'de bir poll'lanır

**UI:**
- `LinearGradient` container
- **Header:** camera-outline (CreateStory), "Canli" yazısı + buton (GoLive), "Ticcer" logosu, notifications-outline + badge (okunmamış sayısı, >0 göster, 99+ üst sınır), paper-plane-outline (ConversationsList)
- `loading ? ActivityIndicator : FlatList`
- **FlatList** `ListHeaderComponent` = StoryPreview (onPress ile storyIndex/storyVisible ayarlar, onLivePress ile liveView)
- **ListEmptyComponent:** "Hələ post yoxdur. İzləməyə başla!"
- **FAB** sağ alt: create-outline (CreatePost)
- **Modal:** StoryViewer (storyVisible), LiveViewerScreen (liveView !== null)

---

## 2. PostDetailScreen (`src/screens/feed/PostDetailScreen.tsx`)

**State:** `post`, `comments`, `newComment`, `replyTo`, `liked`, `likesCount`, `saved`, `showShare`, `showReport`

**Fonksiyonlar:**
- `fetchPost()` — tek post + like sayısı + kullanıcının like/save durumu
- `fetchComments()` — parent_id'ye göre gruplanmış yorumlar + cevaplar
- `toggleLike()` — post_likes ekle/sil
- `handleComment()` — yeni yorum ekle (opsiyonel parent_id)
- `timeAgo` — created_at'i Azerbaycan formatına çevirir
- `deleteComment(id)` — Alert onayı sonrası silme
- `canDeleteComment(commentUserId)` — kullanıcı yorum sahibi veya post sahibi mi?
- `renderComment(comment, isReply)` — avatar harfi, isim, içerik, "Cavabla", koşullu çöp kutusu
- Geri navigasyon: `source` parametresine göre ProfileTab/SearchTab yönlendirmesi

**UI:**
- `KeyboardAvoidingView` + `LinearGradient`
- **Header:** "← Geri" butonu
- **FlatList** `ListHeaderComponent`:
  - Post üst satırı: avatar (resim veya harf), ad soyad, @username, zaman, kendi postuysa trash-outline / başkasınınkiyse ellipsis-horizontal + rapor
  - Post içeriği
  - Koşullu post resmi
  - Aksiyon satırı: heart/heart-outline (sayı), chatbubble-outline (sayı), bookmark/bookmark-outline, share-outline
- **ListEmptyComponent (yorumlar):** "Hələ şərh yoxdur. İlk şərh yazan ol!"
- **Yorumlar:** iç içe cevaplar
- **Alt giriş:** reply-to çubuğu ("{name}'ə cavab" + close-outline), TextInput (chatbubble-outline), send butonu (boşken disabled)
- **ReportModal** bileşeni
- **Share modal (bottom sheet):** "Paylaş", "Dostlara göndər" (ConversationsList), "Digər proqramlara göndər" (native Share), "Ləğv et"

**Iconlar:** `trash-outline`, `ellipsis-horizontal`, `heart`/`heart-outline`, `chatbubble-outline`, `bookmark`/`bookmark-outline`, `share-outline`, `close-outline`, `arrow-forward`

---

## 3. CreatePostScreen (`src/screens/feed/CreatePostScreen.tsx`)

**State:** `content`, `image`, `uploading`

**Regex:** `HASHTAG_RE = /#(\w+)/g`, `MENTION_RE = /@(\w+)/g`

**Fonksiyonlar:**
- `pickImage()` — image picker (editing açık)
- `uploadImage(uri)` — 800px compress, post-images bucket'ına upload
- `processHashtags(postId)` — hashtag'leri parse edip `hashtags` ve `post_hashtags` tablolarına ekler
- `processMentions(postId)` — @mention'ları parse edip profile'da arar, `mentions` tablosuna ekler
- `handlePost()` — validasyon, resim upload, post insert, hashtag/mention işleme, Alert + geri dön

**UI:**
- `KeyboardAvoidingView` + `LinearGradient`
- **Header:** "Ləğv et" (cancel), "Yeni Post" başlık, "Paylaş" butonu (içerik/resim yoksa disabled, uploading'de ActivityIndicator)
- **Multiline TextInput:** placeholder "Nə düşünürsən?", maxLength 500
- **Koşullu resim önizlemesi:** üzerinde **close-outline** kaldırma butonu
- **"Şəkil əlavə et" butonu:** camera-outline icon, kesik çerçeve

---

## 4. PostCard (`src/components/PostCard.tsx`)

**State:** `liked`, `likesCount`, `saved`, `showShare`, `showReport`

**Regex:** `HASHTAG_RE`, `MENTION_RE`

**Fonksiyonlar:**
- `renderContent(text)` — metni hashtag (#mavi), mention (@yeşil) ve düz metin olarak böler
- `handleHashtagPress(tag)` — SearchTab'e yönlendirir
- `handleMentionPress(mention)` — SearchTab'e searchUser ile yönlendirir
- `toggleLike()`, `toggleSave()`, `handleRepost()`, `handleShareToFriends()`, `handleShareToApps()`

**UI:**
- **Kart:** avatar (resim/harf), ad + VerifiedBadge, @username + zaman, kendi postuysa trash-outline / başkasınınkiyse "..." menü
- **İçerik:** tıklanabilir hashtag ve mention'lar
- **Koşullu post resmi**
- **Aksiyon satırı:** heart (sayı), chatbubble-outline (sayı), repeat-outline, bookmark toggle, share-outline
- **Share modal:** "Paylaş", "Dostlara göndər", "Digər proqramlara göndər", "Şikayət et", "Ləğv et"
- **ReportModal** bileşeni

---

## 5. CreateStoryScreen (`src/screens/story/CreateStoryScreen.tsx`)

**State:** `uploading`

**Fonksiyonlar:**
- `pickMedia(useCamera)` — kamera veya galeri (resim+video)
- `uploadStory(asset)` — resimse compress, `stories` bucket'ına upload, 24 saat `expires_at` ile story row'u insert

**UI:**
- `LinearGradient` container (ortalanmış)
- **Başlık:** "Story elave et"
- **Alt başlık:** "24 saat erzinde gorunecek"
- **2 buton:** "Kamera" ve "Galeriya" (uploading'de opacity azalır, disabled)
- **"Legv et"** iptal yazısı

---

## 6. ReelsScreen (`src/screens/reels/ReelsScreen.tsx`)

**State:** `reels`, `loading`, `activeIndex`, `focused`
**Ref:** `flatListRef`

**Fonksiyonlar:**
- `fetchReels()` — tüm reels + profil + like sayısı
- `useFocusEffect` — focused true/false
- `onViewableItemsChanged` — activeIndex günceller
- `route.params.reelId` ile belirli reele scroll

**UI:**
- **Siyah arkaplan**
- **Absolute header:** "Reels" logosu, "+" butonu (CreateReel)
- `loading ? ActivityIndicator : FlatList`
- **FlatList:** `pagingEnabled`, dikey snap, ReelItem (isActive = activeIndex && focused)
- **ListEmptyComponent:** "Hələ reel yoxdur"

---

## 7. CreateReelScreen (`src/screens/reels/CreateReelScreen.tsx`)

**State:** `description`, `video`, `uploading`

**Fonksiyonlar:**
- `pickVideo()` — video picker (max 60sn)
- `uploadVideo(uri)` — reels bucket'ına upload
- `handleUpload()` — validasyon + upload + reel insert

**UI:**
- `KeyboardAvoidingView` + `LinearGradient`
- **Header:** "Ləğv et", "Reel yüklə", spacer
- **Video seçici (kesik çerçeve):** boşken videocam-outline + "Video seç", seçiliyken checkmark-outline + "Video seçildi"
- **TextInput:** "Başlıq yaz..." placeholder
- **"Paylaş" butonu:** video yoksa veya uploading'de disabled, uploading'de ActivityIndicator

---

## 8. ReelItem (`src/components/ReelItem.tsx`)

**State:** `liked`, `likesCount`, `showShare`, `showReport`
**Player:** `useVideoPlayer` (loop)

**Fonksiyonlar:**
- `isActive`'e göre auto-play/pause, aktifken view kaydı
- `toggleLike()`, `handleShareToFriends()`, `handleShareToApps()`

**UI:**
- **VideoView** (tam yükseklik, cover fit, native controls yok)
- **Overlay:** alt kısımda kullanıcı adı + açıklama, sağ tarafta heart (sayı), paper-plane-outline (paylaş), flag-outline (rapor)
- **Share modal:** "Paylaş", "Dostlara göndər", "Digər proqramlara göndər", "Ləğv et"
- **ReportModal**

---

## 9. SearchScreen (`src/screens/search/SearchScreen.tsx`)

**State:** `query`, `results` (Profile[]), `hashtagResults` (Post[]), `communityResults` (Community[]), `searching`, `followingIds` (Set), `mode` ('users'|'hashtags'|'communities')
**Route params:** `initialHashtag`, `initialSearchUser`

**Fonksiyonlar:**
- `fetchFollowingIds()` — takip edilen ID'leri yükler
- Debounced search (300ms): mode hashtag veya `#` ile başlıyorsa `post_hashtags`'de ara; mode community ise `communities`'de ilike; değilse profile'da ilike
- `handleFollow(targetId)` / `handleUnfollow(targetId)`
- `onChangeText` — `#` ile başlarsa otomatik hashtag mode

**UI:**
- `LinearGradient`
- **Header:** "Axtarış"
- **Arama çubuğu:** search-outline, TextInput ("İstifadəçi, #hashtag və ya community axtar..."), koşullu **close-outline** temizleme butonu
- **Tab bar:** "İstifadəçilər" | "Hashtag" | "Community" (active: alt çizgi + primary renk)
- **Koşullu:**
  - searching: ActivityIndicator
  - hashtag mode + sonuç: FlatList post (içerik önizleme, @username) → PostDetail
  - community mode + sonuç: FlatList (avatar harf, isim, açıklama) → CommunityDetail
  - users mode + sonuç: FlatList (avatar harf, username, full_name, "İzlə"/"İzlənir" butonu)
  - sorgu var ama sonuç yok: "Nəticə tapılmadı"
  - sorgu yok: hiçbir şey render edilmez

---

## 10. ProfileScreen (`src/screens/profile/ProfileScreen.tsx`)

**State:** `profileUser`, `followersCount`, `followingCount`, `postsCount`, `mediaTab` ('posts'|'reels'|'saved'), `userPosts`, `userReels`, `savedPosts`
**Computed:** `targetId`, `isOwnProfile`, `displayProfile`, `imagePosts`, `videoReels`

**Fonksiyonlar:**
- `fetchSavedPosts()` — saved_posts + nested post+profile
- `loadProfile()` — profil getir (kendin değilse), follower/following/post sayıları, post/reels getir
- `handleShareProfile()` — ConversationsList'e shareProfile ile yönlendir

**UI:**
- `LinearGradient`
- **Kendi profili:** paper-plane-outline (paylaş), settings-outline (ayarlar)
- **Başkasının profili:** "← Geri" + paper-plane-outline (paylaş)
- **Profil:** avatar (resim/harf), ad + VerifiedBadge, @username, bio (varsa)
- **İstatistik satırı:** "Paylaşımlar" (sayı), "İzləyicilər" (sayı), "İzlənilən" (sayı)
- **Tab bar:** "Şəkillər" (image-outline), "Videolar" (videocam-outline), "Saxlanılan" (bookmark, sadece kendi profili)
- **İçerik:**
  - Posts: 3 sütunlu grid (resim) → PostDetail / boş: "Hələ şəkil yoxdur"
  - Reels: 3 sütunlu grid (video thumbnail + play-outline overlay) / boş: "Hələ video yoxdur"
  - Saved: 3 sütunlu grid (resim veya text placeholder) / boş: "Saxlanılan post yoxdur"

---

## 11. EditProfileScreen (`src/screens/profile/EditProfileScreen.tsx`)

**State:** `username`, `fullName`, `bio`, `avatarUrl`, `uploading`, `loading`

**Fonksiyonlar:**
- `handlePickAvatar()` — resim seç + compress + upload
- `handleSave()` — username required validasyonu, profile update, `refreshProfile()`

**UI:**
- `KeyboardAvoidingView` + `LinearGradient`
- **Başlık:** "Profili düzəliş et"
- **Avatar (tıklanabilir):** uploading'de ActivityIndicator, avatar varsa resim, yoksa harf, "Dəyiş" ipucu
- **3 adet FormInput:** "İstifadəçi adı", "Ad soyad", "Bio"
- **"Yadda saxla" butonu:** uploading/loading'de disabled, loading'de "Yadda saxlanılır..."

---

## 12. ChatScreen (`src/screens/chat/ChatScreen.tsx`)

**State:** `messages`, `text`, `selectMode`, `selectedIds` (Set), `isRecording`, `recordingDur`, `playingMsgId`, `showReport`, `reportTargetId`, `recordedVoice`, `sending`, `otherProfile`
**Refs:** `flatListRef`, `durInterval`, `recordingStartedAt`
**Audio:** `recorder` (useAudioRecorder), `player` (useAudioPlayer), `status`, `previewPlayer`, `previewPlayerStatus`
**Alt bileşen:** `VoiceWave` — 5 çubuklu animasyonlu ses görselleştirme (Animated.View, heights 8-20)

**Fonksiyonlar:**
- `fetchMessages()` — mesajları getir
- `handleSharedContentPress(metadata)` — metadata tipine göre PostDetail/Reels/Profile
- `fetchOtherProfile()` — 15s'de bir diğer profil
- Auto mark read/delivered
- `sendMessage()` — text mesajı gönder
- `startVoiceRecording()` — mikrofon izni, recorder hazırla, süre timer'ı başlat
- `stopVoiceRecording()` — recorder durdur, interval temizle
- `sendVoiceMessage()` — ses upload + mesaj insert
- `togglePlayVoice(msgId, audioUrl)` — sesli mesaj oynat/durdur
- `togglePreviewPlayback()` — kaydedilmiş ses önizleme
- `closePreview()` — önizleme durdur + recordedVoice temizle
- `deleteSelected()` — Alert onayı, seçili mesajları sil
- `toggleSelect(id)` — seç/kaldır
- `formatDur(seconds)` — m:ss formatı
- `renderMessage` — sesli/paylaşılan/call/text mesaj render'ı

**UI:**
- `KeyboardAvoidingView` + `LinearGradient`
- **Header:** back/"Imtina", isim (veya "{n} secildi"), durum (online/offline + son gorulme), arama (call/videocam), "Sec" butonu (selectMode'da spacer)
- **FlatList** mesajlar (auto-scroll)
- **Select mode alt çubuğu:** "Secilmisleri sil ({n})" + "Şikayət et"
- **Recording mode çubuğu:** kırmızı nokta + "Ses yazilir" + süre + stop butonu
- **Voice preview çubuğu:** close-circle, play/pause, musical-note + süre, send
- **Normal input:** TextInput "Mesaj yaz...", "Gonder" / mic Pressable (onPressIn/onPressOut)
- **ReportModal** (seçili mesajlar için)

**Iconlar:** `call`, `videocam`, `trash-outline`, `flag-outline`, `checkmark`, `checkmark-done`, `mic`, `send`, `stop-circle`, `close-circle`, `play`/`pause`, `musical-note`, `hourglass`, `document-text`, `person`, `tv-outline`

---

## 13. ConversationsListScreen (`src/screens/chat/ConversationsListScreen.tsx`)

**State:** `conversations`, `loading`, `deleteTarget`
**Route params:** `sharePost`, `shareReel`, `shareProfile`
**Computed:** `shareItem`, `shareType`

**Fonksiyonlar:**
- `fetchConversations()` — katılımcıları getir, diğer kullanıcının profilini al, mesajları getir, undelivered'ları delivered yap, konuşma bazında grupla
- `handleConversationPress(item)` — sharing varsa metadata oluştur + mesaj ekle + ChatScreen; direkt
- `deleteForMe(id)` — kendi katılımını sil
- `deleteForEveryone(id)` — mesajları, katılımcıları ve konuşmayı sil
- 10s'de bir poll

**UI:**
- `LinearGradient`
- **Header:** "Paylaş" veya "Mesajlar", "+" butonu (sharing'de gizli)
- **FlatList:** avatar (resim/harf), online noktası, isim, son mesaj ("🎤 Sesli mesaj" voice ise), zaman
- **ListEmptyComponent:** "Henuz mesajlasma yox"
- **Delete modal (bottom sheet, deleteTarget):** "Söhbəti sil", "Mənim üçün sil" (açıklamalı), "Hamı üçün sil" (kırmızı), "Ləğv et"
- Uzun basınca delete modal açılır

---

## 14. NewConversationScreen (`src/screens/chat/NewConversationScreen.tsx`)

**State:** `search`, `users`

**Fonksiyonlar:**
- `searchUsers()` — username ilike ara (kendini hariç tut)
- `startChat(otherUserId)` — mevcut konuşmayı kontrol et, yoksa UUID ile yeni konuşma oluştur, ChatScreen'e git

**UI:**
- `LinearGradient`
- **Header:** "Geri", "Yeni mesaj", spacer
- **Arama satırı:** TextInput ("Istifadeci adi ile axtar..."), "Axtar" butonu
- **FlatList:** avatar harf, full_name, @username handle; onPress → startChat
- **ListEmptyComponent:** "Istifadeci axtar"

---

## 15. CallScreen (`src/screens/call/CallScreen.tsx`)

**Alt bileşen:** `ParticipantVideo` — VideoTrack render (kamera/ekran paylaşımı)

**State:** `token`, `connected`, `duration`, `myCallId`, `muted`, `cameraOn`
**Refs:** `roomRef`, `durInterval`, `timeoutRef`, `endedRef`

**Fonksiyonlar:**
- `initCall()` — mevcut çağrı yoksa Supabase'de call kaydı oluştur, güncellemelere abone ol (ended/rejected/missed), 30s timeout (missed), LiveKit token al
- `onConnected()` — connected=true, süre sayacı, call status 'ongoing'
- `endCall()` — çift tetiklemeyi engelle, call 'ended', call mesajı ekle (cancelled/ended), disconnect
- `toggleMute()` / `toggleCamera()`
- `formatDur()` — m:ss
- `insertCallMessage(status)` — call metadata mesajı

**UI:**
- **Pre-connection:** LinearGradient, call icon, "Zəng qurulur..."
- **LiveKitRoom** + audio/video
- **ParticipantVideo** (video call ise)
- **Bilgi:** arayan ismi, süre veya "Bağlanır..."
- **Kontroller:** Camera toggle (videocam/videocam-off), Mic toggle (mic/mic-off), Kırmızı bitir butonu (call)

---

## 16. IncomingCallScreen (`src/screens/call/IncomingCallScreen.tsx`)

**State:** `callerName`
**Ref:** `endedRef`

**Fonksiyonlar:**
- Titreşim başlat
- İsim verilmemişse arayan profilini getir
- Call güncellemelerine abone ol (ended/missed/ongoing)
- `acceptCall()` — call 'ongoing', CallScreen'e yönlendir
- `rejectCall()` — call 'rejected', rejected mesajı ekle, geri dön
- `insertCallMessage(status)`

**UI:**
- `LinearGradient` + `SafeAreaView`
- **Üst:** avatar dairesi + call/video icon, arayan ismi, çağrı tipi ("📹 Video zəng" / "📞 Səsli zəng")
- **Aksiyonlar:** reddet (135° döndürülmüş kırmızı daire, call icon) "Rədd et", kabul et (yeşil daire, call icon) "Qəbul et"

---

## 17. CommunityListScreen (`src/screens/community/CommunityListScreen.tsx`)

**State:** `communities`, `loading`

**Fonksiyonlar:**
- `fetchCommunities()` — tüm community'ler + üye sayısı, kullanıcının üyelik durumu
- `joinCommunity(communityId)` — member olarak ekle
- `leaveCommunity(communityId)` — üyeliği sil

**UI:**
- `LinearGradient`
- **Header:** "Topluluqlar", "+" (CreateCommunity)
- **FlatList kartlar:** icon (resim/harf), isim + VerifiedBadge (varsa), "{n} uye", açıklama (varsa), "Qatil"/"Cix" butonu
- **ListEmptyComponent:** "Henuz topluluq yox"

---

## 18. CommunityDetailScreen (`src/screens/community/CommunityDetailScreen.tsx`)

**State:** `channels`, `showCreate`, `channelName`, `channelType` ('text'|'voice'), `voiceParticipants`
**Computed:** `isOwner`, `textChannels`, `voiceChannels`

**Fonksiyonlar:**
- `fetchChannels()` — kanalları getir, voice kanalları için katılımcıları getir
- `fetchVoiceParticipants(voiceChannels)` — channel_id'ye göre grupla
- `createChannel()` — kanal ekle
- `ChannelItem` bileşeni — # (text) / mic (voice) icon, isim, voice katılımcı listesi (varsa), katılımcı sayısı rozeti, shield (owner için izin butonu)

**UI:**
- `LinearGradient`
- **Header:** "Geri", community ismi + VerifiedBadge, shield-outline (role management, sadece owner)
- **FlatList** `ListHeaderComponent`: açıklama ("Aciklama yox" fallback), "Metn kanallari" / "Sesli kanallar" başlıkları
- **Kanal item'leri:** tıklayınca VoiceChannel / ChannelChat
- **Owner alt aksiyonlar:** "+ Kanal elave et" butonu veya create form (TextInput, tip toggle "# Metn" / mic "Ses", "Yarat", "Legv")

---

## 19. ChannelChatScreen (`src/screens/community/ChannelChatScreen.tsx`)

**State:** `messages`, `text`, `profiles`, `isBanned`, `bannedWords`, `slowMode`, `slowInterval`, `lastMsgTime`, `isRecording`, `recordingDur`, `playingMsgId`, `recordedVoice`, `sending`
**Audio:** ChatScreen ile aynı (VoiceWave, recorder, player, previewPlayer)

**Fonksiyonlar:**
- `fetchMessages()` — channel_messages + profiles
- `checkBan()` — channel_bans kontrol
- `fetchChannelSettings()` — banned_words, slow_mode, slow_mode_interval
- `containsBannedWord(content)` — yasaklı kelime kontrolü
- `sendMessage()` — ban kontrolü, yasaklı kelime, slow mode cooldown, mesaj ekle
- Voice recording (ChatScreen ile aynı)
- `renderMessage` — avatar harf, gönderen ismi, zaman, voice/text içerik

**UI:**
- `KeyboardAvoidingView` + `LinearGradient`
- **Header:** "Geri", `#channel.name`, community ismi, "Ayarlar"
- **Ban banner (kırmızı):** "Bu kanalda banlandiniz"
- **Slow mode banner (uyarı):** "Yavas rejim: {n} saniye"
- **FlatList** (auto-scroll)
- **Input (banlıysa gizli):** recording bar, voice preview, normal input (TextInput + send/mic)

---

## 20. ChannelSettingsScreen (`src/screens/community/ChannelSettingsScreen.tsx`)

**State:** `bannedWords`, `newWord`, `slowMode`, `slowInterval`, `bans`, `members`

**Fonksiyonlar:**
- `fetchBans()` — bans + profiles
- `fetchMembers()` — community üyeleri (kendin hariç)
- `addBannedWord()` — array'e ekle, kanalı güncelle
- `removeBannedWord(word)` — filtrele
- `toggleSlowMode(value)` — slow_mode + interval güncelle
- `banUser(targetId, name)` — Alert onayı, channel_ban ekle
- `unbanUser(banId)` — ban sil
- `kickUser(targetId, name)` — Alert onayı, ban ekle (kick olarak)

**UI:**
- `LinearGradient`
- **Header:** "Geri", "# {channel.name} ayarlari", shield (ChannelPermissions)
- **"Yavas rejim":** Switch + koşullu numeric input (saniye)
- **"Qadagan sozler":** TextInput + "Elave et", kelime etiketleri + **X** kaldırma
- **"Banli istifadeciler":** banlı kullanıcı listesi + "Ban geri al", "Banli yox"
- **"Uyeleri idare et":** üye listesi (isim/@username) + "Kick" + "Ban"

---

## 21. VoiceChannelScreen (`src/screens/community/VoiceChannelScreen.tsx`)

**State:** `participants`, `joined`, `muted`, `screenSharing`
**Refs:** `previousCountRef`, `playerRef`
**Constants:** `GIRIS_SES_URL`, `CIKIS_SES_URL`

**Fonksiyonlar:**
- `playSound(uri)` — giriş/çıkış sesi
- `fetchParticipants()` — voice participants + profiles
- `joinVoice()` — participant ekle, giriş sesi
- `leaveVoice()` — participant sil, screen sharing temizle, çıkış sesi
- `cleanup()` — unmount'ta participant silindiğinden emin ol
- `toggleMute()` / `toggleScreenShare()`

**UI:**
- `LinearGradient`
- **Header:** "Geri", mic + kanal ismi, "Ayarlar"
- **Voice alanı:** büyük mic icon, "Sesli otaq başlık", "{n} istifadeci bagli" (varsa " - Ekran paylasilir"), katılımcı listesi (avatar, isim, mute/unmute icon)
- **Joined:** mute toggle, screen share toggle, "Ayril" butonu
- **Not joined:** "Otaga qatil" butonu

---

## 22. CreateCommunityScreen (`src/screens/community/CreateCommunityScreen.tsx`)

**State:** `name`, `description`, `loading`

**Fonksiyonlar:**
- `handleCreate()` — community ekle, creator'ı admin olarak ekle, "genel" ve "duyurular" kanallarını oluştur

**UI:**
- `LinearGradient`
- **Header:** "Geri", "Topluluq yarat", spacer
- **Form:** TextInput "Topluluq adi", multiline TextInput "Aciklama (istegene bagli)", "Yarat" + ActivityIndicator

---

## 23. RoleManagementScreen (`src/screens/community/RoleManagementScreen.tsx`)

**State:** `roles`, `members`, `showCreate`, `roleName`, `roleColor`, `showAssign`, `selectedRole`, `editingRole`
**Constants:** `PERMISSION_LABELS`, `COLORS` (8 renk)
**Alt bileşenler:** `RoleBadge`, `AssignRoleModal`, `TouchableIndicator`

**Fonksiyonlar:**
- `fetchRoles()` / `fetchMembers()`
- `createRole()` / `deleteRole(roleId)` — Alert onayı
- `assignRole(userId)` / `removeRole(userId, roleId)`

**UI:**
- `LinearGradient`
- **Header:** "Geri", "Rollar", person-add (AssignRoleModal)
- **FlatList roller:** renk noktası, rol adı, permission listesi, trash-outline sil
- **ListHeader:** "Rol yarat" butonu veya form (TextInput "Rol adi", 8 renk seçici, "Yarat", "Legv")
- **AssignRoleModal:** üye listesi (username, rol rozetleri ✕ ile kaldırma, "+ Rol" ekle)
- **ListEmptyComponent:** "Hələ rol yaradılmayıb"

---

## 24. ChannelPermissionsScreen (`src/screens/community/ChannelPermissionsScreen.tsx`)

**State:** `roles`, `permissions` (Record<roleId, perm>)

**Fonksiyonlar:**
- `fetchRoles()` — roller + mevcut channel_permissions
- `togglePermission(roleId, field, value)` — channel_permissions ekle/güncelle (can_read/can_write/can_voice)

**UI:**
- `LinearGradient`
- **Header:** "Geri", "# {channel.name} - İcazələr"
- **FlatList** her rol için: renk noktası, isim, "Oxu" (eye-outline), "Yaz" (create-outline), "Danış" (mic-outline, sadece voice kanalları)
- **ListEmptyComponent:** "Hələ rol yoxdur"

---

## 25. NotificationsScreen (`src/screens/notifications/NotificationsScreen.tsx`)

**State:** `notifications`, `loading`

**Fonksiyonlar:**
- `fetchNotifications()` — tüm bildirimler, en yeni önce
- `markAsRead(id)` — read:true
- `deleteAll()` — Alert onayı
- `getIcon(type)` — tip → icon mapping

**UI:**
- `LinearGradient`
- **Header:** "Geri", "Bildirislər", "Hamısını sil" (varsa)
- **FlatList:** icon (tipine göre), title, body (varsa), timestamp, okunmamış noktası (varsa), okunmamışlara tinted arkaplan
- **ListEmptyComponent:** "Bildiris yoxdur"
- **Loading:** "Yuklenir..."

---

## 26. SettingsScreen (`src/screens/settings/SettingsScreen.tsx`)

**State:** `prefs` (NotificationPreferences)

**Fonksiyonlar:**
- Load/create default notification preferences
- `updatePref(key, value)`
- `handleLogout()` — signOut
- `notifItems`: likes ("Bəyənmələr"), comments ("Şərhlər"), follows ("İzləmələr"), mentions ("Mentionlar"), messages ("Mesajlar")

**UI:**
- `LinearGradient`
- **Header:** "Geri", "Ayarlar"
- **ScrollView:**
  - **"Görünüş":** moon-outline/sunny-outline, "Tema", "Qaranlıq" veya "İşıqlı"
  - **"Bildirişlər":** Switch'ler (her notif tipi için icon + label)
  - **"Hesab":** "Profili düzəlt" (EditProfile), "Gold istəyi göndər" (sadece verified_type==='gray', GoldRequest), "Çıxış et" (kırmızı)

---

## 27. GoldRequestScreen (`src/screens/settings/GoldRequestScreen.tsx`)

**State:** `fullName`, `dob`, `passportImage`, `uploading`

**Fonksiyonlar:**
- `pickImage()` — image picker
- `handleSubmit()` — validasyon, compress, upload (gold-requests), gold_requests row insert

**UI:**
- `LinearGradient`
- **Header:** "Geri", "Gold İstəyi"
- **ScrollView:** tıklanabilir resim alanı (pasaport preview veya camera-outline + "Pasport şəklini əlavə et"), "Pasportda yazılan ad soyad" + TextInput, "Doğum tarixi" + TextInput ("GG.AA.YYYY"), "Göndər" + ActivityIndicator

---

## 28. AdminPanelScreen (`src/screens/admin/AdminPanelScreen.tsx`)

**Type:** `Section = 'users' | 'gold_requests' | 'reports'`
**Constants:** `REASON_LABELS`

**State:** `section`, `users` (Profile[]), `reports` (enriched), `goldRequests`, `loading`, `showRejectModal`, `rejectTarget`, `rejectReason`
**Access control:** admin veya red-verified değilse yönlendir

**Fonksiyonlar:**
- `fetchUsers()`, `fetchReports()`, `fetchGoldRequests()`
- `approveGold(requestId, userId)` — verified_type='gold', notification
- `rejectGold(requestId, userId)` — rejected, notification
- `handleApprove(reportId, reporterId, targetUserId?)` — onayla + warning notification
- `openRejectModal(reportId, reporterId)` / `handleReject()` — reddet + sebep + notification
- `handleDeleteReport(reportId)`, `handleDeleteGoldRequest(requestId)`
- `toggleGold(userId, current)` — gold/none toggle
- `renderUser` — isim + VerifiedBadge + handle + Gold toggle / Admin badge
- `renderReport` — tip icon, durum badge, raporlayan, sebep, içerik önizleme (post/reel/message), resim, açıklama, tarih, admin notu, approve/reject/delete
- `renderGoldRequest` — avatar, isim, durum badge, ad soyad, DOB, pasaport, approve/reject/delete

**UI:**
- `LinearGradient`
- **Header:** "← Geri", "Admin Panel"
- **Tab bar:** "Users" (people-outline), "Gold Request" (ribbon-outline), "Reports" (flag-outline)
- **Users:** FlatList + Gold toggle / Admin badge
- **Gold requests:** FlatList + approve/reject/delete
- **Reports:** FlatList + approve/reject/delete
- **Empty:** placeholder icon
- **Reject modal:** TextInput (sebep), "Ləğv et" / "Rədd et"

---

## 29. CameraScreen (`src/screens/camera/CameraScreen.tsx`)

**Imports:** `FILTERS`, `STICKERS` from `../../constants/filters`

**State:** `permission`, `selectedFilter`, `selectedSticker`, `mode` ('camera'|'gallery'), `capturedUri`, `uploading`
**Ref:** `cameraRef` (CameraView)

**Fonksiyonlar:**
- `takePicture()`, `pickFromGallery()`
- `applyEffects(uri)` — filter color overlay
- `shareAsPost()` — compress, upload, post oluştur ("(kamera)" içerikli)
- `shareAsStory()` — compress, upload, story oluştur (24h)

**UI (koşullu):**
- **İzin yok:** "Kamera icazesi teleb olunur", "Icaze ver"
- **capturedUri set:** "Geri", "On izleme", filter overlay, "Foto chekildi. Effektler elave edildi.", "Post kimi paylas" / "Story kimi paylas" (+ActivityIndicator)
- **Camera mode:** CameraView (ön kamera), filter overlay, sticker text, **"X"** kapat, "Galeriya" toggle, capture butonu (dış halka + iç), filter bar (ScrollView daireler + isimler), sticker bar (emoji sticker ScrollView)
- **Gallery mode:** "Kameraya don", image picker + image-outline + "Sekil sec"

---

## 30. GoLiveScreen (`src/screens/live/GoLiveScreen.tsx`)

**Alt bileşen:** `BroadcasterVideo`

**State:** `permission`, `step` ('preview'|'live'), `title`, `token`, `roomName`, `liveId`, `connected`, `duration`, `muted`, `cameraOn`, `viewerCount`
**Refs:** `roomRef`, `durInterval`, `endingRef`, `liveIdRef`

**Fonksiyonlar:**
- Kamera izni iste
- Live güncellemelerine abone ol (viewer_count)
- `startLive()` — live insert, LiveKit token (publisher=true), step='live'
- `onConnected()` — süre sayacı
- `endLive()` — çift tetiklemeyi engelle, live ended, disconnect
- `toggleMute()` / `toggleCamera()`
- `formatDur()`

**UI:**
- **Preview:** CameraView / gradient fallback, **X** kapat, TextInput "Yayin basligi..." (maxLength 60), "Canli yayina basla" kırmızı buton
- **Token loading:** "Yayin hazirlanir..."
- **Live:** LiveKitRoom + BroadcasterVideo, overlay (kırmızı nokta + "Canli" + süre), eye + sayı, "Bitir", kamera/mic toggle

---

## 31. LiveViewerScreen (`src/screens/live/LiveViewerScreen.tsx`)

**Alt bileşen:** `BroadcasterVideo` (track yoksa "Yayin gormek ucun gozleyin...")

**State:** `token`, `connected`, `ended`, `viewerCount`, `duration`
**Refs:** `roomRef`, `durInterval`, `endedRef`

**Fonksiyonlar:**
- `initViewer()` — LiveKit token (publisher=false)
- `onConnected()` — süre sayacı
- Live güncellemelerine abone ol (ended, viewer_count)
- `formatDur()`

**UI:**
- **Ended:** stop-circle-outline, "Yayin sona erdi", "Bagla"
- **Loading:** "Qosulur..."
- **Live:** LiveKitRoom (audio only), BroadcasterVideo, overlay (kırmızı nokta + "Canli" + süre), eye + sayı, **close** butonu, alt bilgi (avatar harf, isim, başlık)

---

## 32. LoginScreen (`src/screens/auth/LoginScreen.tsx`)

**State:** `email`, `password`, `loading`, `errors`

**Fonksiyonlar:**
- `validate()` — email boş/gçersiz, şifre boş
- `handleLogin()` — signIn, error Alert

**UI:**
- `KeyboardAvoidingView` + `LinearGradient`
- **Ortalanmış:** "Ticcer" logosu, "Daxil ol" alt başlık
- **2 FormInput:** "Email" (email keyboard, no auto-cap, error), "Şifrə" (secure, error)
- **"Daxil ol" butonu** (loading'de "Daxil olunur...")
- **"Şifrəni unutdun?"** link (ForgotPassword)
- **"Hesabın yoxdur? Qeydiyyat"** link (Register)

---

## 33. RegisterScreen (`src/screens/auth/RegisterScreen.tsx`)

**State:** `username`, `fullName`, `email`, `password`, `loading`, `errors`

**Fonksiyonlar:**
- `validate()` — username, fullName, email (format), password (min 6)
- `handleRegister()` — signUp, success Alert (confirmation email)

**UI:**
- `KeyboardAvoidingView` + `LinearGradient`
- **"Qeydiyyat"** başlık
- **4 FormInput:** "İstifadəçi adı" (no auto-cap), "Ad soyad", "Email", "Şifrə"
- **"Qeydiyyatdan keç"** (loading'de "Qeydiyyat...")
- **"Hesabın var? Daxil ol"** link

---

## 34. ForgotPasswordScreen (`src/screens/auth/ForgotPasswordScreen.tsx`)

**State:** `email`, `loading`, `sent`, `errors`

**Fonksiyonlar:**
- `validate()` / `handleReset()` — resetPassword, sent=true

**UI:**
- `KeyboardAvoidingView` + `LinearGradient`
- **"Ticcer"** logosu, **"Şifrəni sıfırla"** alt başlık
- **sent ise:** success mesajı, "Geri dön"
- **değilse:** bilgi metni, FormInput "Email", "Link göndər" (loading'de "Göndərilir...")
- **"Geri dön"** link

---

## Bileşenler

### StoryPreview (`src/components/StoryPreview.tsx`)
- Yatay ScrollView: live kullanıcılar önce, sonra story'si olanlar
- Avatar halkası: kırmızı (live), primary (izlenmemiş), muted (izlenmiş), yeşil (kendi)
- Live badge "Canli", "Sənin" etiketi, live başlığı veya göreceli zaman
- 30s poll + lives_realtime channel aboneliği

### StoryViewer (`src/components/StoryViewer.tsx`)
- Tam ekran resim, 5s otomatik geçiş + progress bar
- Sol/orta/sağ tık: önceki/sıradaki/ilerle
- **Sağ üst: X close-outline** kapatma
- İzleyici sayısı (sahibiyse), username + zaman
- View kaydı (mount'ta)

### FormInput (`src/components/FormInput.tsx`)
- Label + TextInput + error mesajı
- secureTextEntry varsa eye-off-outline/eye-outline toggle

### NotificationBanner (`src/components/NotificationBanner.tsx`)
- Animated slide-down banner (3.5s)
- Supabase INSERT aboneliği (kendi bildirimleri)
- Icon + title + body, tıklayınca Notifications

### ReportModal (`src/components/ReportModal.tsx`)
- 7 sebep (icon + label + checkmark)
- "Ətraflı məlumat (istəyə bağlı)" TextInput
- "Göndər" / "Göndərilir..."

### VerifiedBadge (`src/components/VerifiedBadge.tsx`)
- checkmark-outline icon, renk: gray #8E8E93 / gold #FFD700 / red #FF3B30

---



---

