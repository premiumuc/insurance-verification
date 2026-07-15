import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { evaluate } from '@healthy-companion/safety-rules';
import type { Message } from '@healthy-companion/types';
import { api } from '@/lib/api';
import { useTheme } from '@/providers/theme';
import { radius, spacing } from '@/theme/tokens';

/**
 * The conversational front door (docs/05 §5.4). Runs the shared safety ruleset locally
 * for an instant emergency route (server stays authoritative), then sends the message.
 * Extracted events land on the dashboard automatically (query invalidation).
 */
export default function Chat() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<Message>>(null);

  // Lazily create a conversation on mount.
  useEffect(() => {
    let active = true;
    void api.createConversation().then((c) => {
      if (active) setConversationId(c.id);
    });
    return () => {
      active = false;
    };
  }, []);

  const send = useMutation({
    mutationFn: async (content: string) => {
      if (!conversationId) throw new Error('no conversation');
      return api.postMessage(conversationId, content);
    },
    onSuccess: (res) => {
      setMessages((prev) => [...prev, res.message]);
      if (res.emergency) router.push('/emergency');
      if (res.createdEventIds.length) {
        void qc.invalidateQueries({ queryKey: ['summary'] });
        void qc.invalidateQueries({ queryKey: ['events'] });
      }
    },
  });

  const onSend = useCallback(() => {
    const content = draft.trim();
    if (!content) return;

    // Instant on-device safety pre-check.
    if (evaluate(content).escalate) {
      router.push('/emergency');
    }

    const optimistic: Message = {
      id: `local-${messages.length}`,
      role: 'user',
      content,
      intent: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    send.mutate(content);
  }, [draft, messages.length, send]);

  useEffect(() => {
    if (messages.length) listRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: spacing.md, paddingTop: insets.top + spacing.md, gap: spacing.sm }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Hi, I'm your companion 👋</Text>
            <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
              Tell me how you're feeling, or log something naturally — "drank 500ml of water",
              "slept 6 hours", "headache since noon". I'll keep good notes.
            </Text>
          </View>
        }
        renderItem={({ item }) => <Bubble message={item} />}
      />

      <View style={[styles.composer, { borderTopColor: theme.border, paddingBottom: insets.bottom + spacing.sm }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Message…"
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
          multiline
          accessibilityLabel="Message input"
          onSubmitEditing={onSend}
        />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Send"
          onPress={onSend}
          disabled={!draft.trim() || !conversationId}
          style={[styles.sendBtn, { backgroundColor: theme.brand, opacity: draft.trim() && conversationId ? 1 : 0.5 }]}
        >
          <Text style={styles.sendText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ message }: { message: Message }) {
  const theme = useTheme();
  const mine = message.role === 'user';
  const isEmergency = message.intent === 'emergency';
  return (
    <View
      style={[
        styles.bubble,
        {
          alignSelf: mine ? 'flex-end' : 'flex-start',
          backgroundColor: isEmergency ? theme.emergency : mine ? theme.brand : theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      <Text style={{ color: mine || isEmergency ? '#fff' : theme.text, fontSize: 15, lineHeight: 21 }}>
        {message.content}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { padding: spacing.lg, gap: spacing.sm, marginTop: spacing.xl },
  emptyTitle: { fontSize: 20, fontWeight: '800' },
  emptyBody: { fontSize: 15, lineHeight: 22 },
  bubble: { maxWidth: '85%', borderWidth: 1, borderRadius: radius.lg, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  composer: { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm, borderTopWidth: 1, alignItems: 'flex-end' },
  input: { flex: 1, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 16, maxHeight: 120 },
  sendBtn: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: '#fff', fontSize: 22, fontWeight: '900' },
});
