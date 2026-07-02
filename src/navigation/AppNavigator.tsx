import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import AuthNavigator from './AuthNavigator';
import FeedScreen from '../screens/feed/FeedScreen';
import CreatePostScreen from '../screens/feed/CreatePostScreen';
import PostDetailScreen from '../screens/feed/PostDetailScreen';
import CreateStoryScreen from '../screens/story/CreateStoryScreen';
import SearchScreen from '../screens/search/SearchScreen';
import ReelsScreen from '../screens/reels/ReelsScreen';
import CreateReelScreen from '../screens/reels/CreateReelScreen';
import ChatScreen from '../screens/chat/ChatScreen';
import ConversationsListScreen from '../screens/chat/ConversationsListScreen';
import NewConversationScreen from '../screens/chat/NewConversationScreen';
import CommunityListScreen from '../screens/community/CommunityListScreen';
import CommunityDetailScreen from '../screens/community/CommunityDetailScreen';
import ChannelChatScreen from '../screens/community/ChannelChatScreen';
import ChannelSettingsScreen from '../screens/community/ChannelSettingsScreen';
import VoiceChannelScreen from '../screens/community/VoiceChannelScreen';
import CreateCommunityScreen from '../screens/community/CreateCommunityScreen';
import RoleManagementScreen from '../screens/community/RoleManagementScreen';
import ChannelPermissionsScreen from '../screens/community/ChannelPermissionsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import AdminPanelScreen from '../screens/admin/AdminPanelScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import GoldRequestScreen from '../screens/settings/GoldRequestScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import { fonts } from '../constants/theme';
import { usePresence } from '../lib/presence';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function FeedStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Feed" component={FeedScreen} />
      <Stack.Screen name="CreatePost" component={CreatePostScreen} />
      <Stack.Screen name="CreateStory" component={CreateStoryScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="ChatScreen" component={ChatScreen} />
      <Stack.Screen name="ConversationsList" component={ConversationsListScreen} />
      <Stack.Screen name="NewConversation" component={NewConversationScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}

function SearchStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SearchMain" component={SearchScreen} />
    </Stack.Navigator>
  );
}

function ReelsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ReelsMain" component={ReelsScreen} />
      <Stack.Screen name="CreateReel" component={CreateReelScreen} />
    </Stack.Navigator>
  );
}

function CommunityStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CommunityList" component={CommunityListScreen} />
      <Stack.Screen name="CommunityDetail" component={CommunityDetailScreen} />
      <Stack.Screen name="ChannelChat" component={ChannelChatScreen} />
      <Stack.Screen name="ChannelSettings" component={ChannelSettingsScreen} />
      <Stack.Screen name="VoiceChannel" component={VoiceChannelScreen} />
      <Stack.Screen name="CreateCommunity" component={CreateCommunityScreen} />
      <Stack.Screen name="RoleManagement" component={RoleManagementScreen} />
      <Stack.Screen name="ChannelPermissions" component={ChannelPermissionsScreen} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="GoldRequest" component={GoldRequestScreen} />
    </Stack.Navigator>
  );
}

function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminMain" component={AdminPanelScreen} />
    </Stack.Navigator>
  );
}

function TabBarIcon({ iconName, color }: { iconName: keyof typeof Ionicons.glyphMap; color: string }) {
  return <Ionicons name={iconName} size={24} color={color} />;
}

function MainTabs() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  usePresence();
  const isAdmin = profile?.role === 'admin' || profile?.verified_type === 'red';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'transparent',
          position: 'absolute',
          borderTopWidth: 0,
          elevation: 0,
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
        },
        tabBarBackground: () => (
          <View style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: colors.glass,
              borderTopWidth: 1,
              borderTopColor: colors.glassBorder,
            },
            styles.glassBlur,
          ]} />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ focused, color }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            FeedTab: focused ? 'home' : 'home-outline',
            SearchTab: focused ? 'search' : 'search-outline',
            ReelsTab: focused ? 'videocam' : 'videocam-outline',
            CommunityTab: focused ? 'people' : 'people-outline',
            AdminTab: focused ? 'shield' : 'shield-outline',
            ProfileTab: focused ? 'person' : 'person-outline',
          };
          return <TabBarIcon iconName={icons[route.name] || 'help-outline'} color={color} />;
        },
      })}
    >
      <Tab.Screen name="FeedTab" component={FeedStack} options={{ tabBarLabel: 'Feed' }} />
      <Tab.Screen name="SearchTab" component={SearchStack} options={{ tabBarLabel: 'Axtar' }} />
      <Tab.Screen name="ReelsTab" component={ReelsStack} options={{ tabBarLabel: 'Reels' }} />
      <Tab.Screen name="CommunityTab" component={CommunityStack} options={{ tabBarLabel: 'Topluluq' }} />
      {isAdmin && (
        <Tab.Screen name="AdminTab" component={AdminStack} options={{ tabBarLabel: 'Admin' }} />
      )}
      <Tab.Screen name="ProfileTab" component={ProfileStack} options={{ tabBarLabel: 'Profil' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer navigationInChildEnabled>
      {user ? <MainTabs /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  glassBlur: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
});
