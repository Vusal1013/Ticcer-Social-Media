import { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { colors, fonts } from '../constants/theme';

type Props = {
  postContent: string;
  postId: string;
  onSuggestionSelect: (suggestion: string) => void;
};

export default function AICommentSuggestions({ postContent, postId, onSuggestionSelect }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function fetchSuggestions() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('ai-comment-suggestions', {
        body: { post_content: postContent, post_id: postId },
      });
      if (response.data?.suggestions) {
        setSuggestions(response.data.suggestions);
        setExpanded(true);
      }
    } catch (err) {
      console.warn('AI suggestions error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (!expanded && suggestions.length === 0) {
    return (
      <TouchableOpacity style={styles.triggerBtn} onPress={fetchSuggestions} activeOpacity={0.7}>
        {loading ? (
          <ActivityIndicator size={14} color={colors.primary} />
        ) : (
          <Ionicons name="sparkles" size={14} color={colors.primary} />
        )}
        <Text style={[styles.triggerText, { color: colors.primary }]}>
          {loading ? 'Hazırlanır...' : 'Şərh təklifləri'}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={14} color={colors.primary} />
        <Text style={[styles.headerText, { color: colors.primary }]}>AI Təklifləri</Text>
        <TouchableOpacity onPress={() => { setExpanded(false); setSuggestions([]); }}>
          <Ionicons name="close-circle" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
      <View style={styles.suggestionsList}>
        {suggestions.map((suggestion, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.suggestionChip, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '25' }]}
            onPress={() => onSuggestionSelect(suggestion)}
            activeOpacity={0.7}
          >
            <Text style={[styles.suggestionText, { color: colors.text }]} numberOfLines={1}>{suggestion}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.refreshBtn} onPress={fetchSuggestions}>
        <Ionicons name="refresh" size={12} color={colors.textMuted} />
        <Text style={[styles.refreshText, { color: colors.textMuted }]}>Yenilə</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  triggerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(108, 99, 255, 0.08)', alignSelf: 'flex-start',
    marginBottom: 8,
  },
  triggerText: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.semibold },
  container: {
    paddingHorizontal: 4, marginBottom: 8,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8,
  },
  headerText: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.bold, flex: 1 },
  suggestionsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  suggestionChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16,
    borderWidth: 1, maxWidth: '100%',
  },
  suggestionText: { fontSize: fonts.sizes.xs },
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, alignSelf: 'flex-start',
  },
  refreshText: { fontSize: 10 },
});
