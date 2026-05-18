/**
 * insights.tsx — AI Brain Assistant
 *
 * Chat with an AI that knows all your ideas.
 * Ask questions, get insights, save any AI response back onto an idea.
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/useAppStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  savedToIdeaId?: string;
}

// ─── Colours ──────────────────────────────────────────────────────────────────

const C = {
  bg: '#0F0F0F',
  surface: '#1A1A1A',
  surfaceAlt: '#252525',
  border: '#2A2A2A',
  text: '#F9FAFB',
  muted: '#64748B',
  sub: '#94A3B8',
  accent: '#EC5B13',
  accentDim: '#7A2D07',
  green: '#10B981',
  userBubble: '#1E3A5F',
};

const SUGGESTIONS = [
  "What themes connect my ideas?",
  "Which ideas contradict each other?",
  "What am I most curious about?",
  "Suggest connections I'm missing",
  "What should I explore next?",
  "Summarise all my ideas briefly",
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const { ideas, folders, updateIdea } = useAppStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Save-to-idea modal state
  const [saveModal, setSaveModal] = useState<{ content: string; msgId: string } | null>(null);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);

  const listRef = useRef<FlatList>(null);

  const allIdeas = Object.values(ideas);
  const allFolders = folders;

  // ─── System prompt: inject every idea into context ──────────────────────────

  function buildSystemPrompt(): string {
    if (allIdeas.length === 0) {
      return `You are a personal knowledge assistant. The user has no ideas saved yet. Encourage them to start capturing ideas and explain how you can help once they do.`;
    }

    const ideaBlocks = allIdeas
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(idea => {
        const folder = allFolders[idea.folderId]?.name ?? 'Uncategorized';
        const connectedTitles = idea.connections
          .map(cid => ideas[cid]?.title || ideas[cid]?.content?.slice(0, 40))
          .filter(Boolean)
          .join(', ');

        return [
          `ID: ${idea.id}`,
          `Title: ${idea.title || '(untitled)'}`,
          `Folder: ${folder}`,
          `Tags: ${idea.tags.length ? idea.tags.join(', ') : 'none'}`,
          `Content: ${idea.content}`,
          idea.source ? `Source: ${idea.source}` : null,
          connectedTitles ? `Connected to: ${connectedTitles}` : null,
          `Saved: ${new Date(idea.createdAt).toLocaleDateString()}`,
        ].filter(Boolean).join('\n');
      })
      .join('\n\n---\n\n');

    return `You are a personal knowledge assistant and thinking partner. You have full access to the user's idea library.

Your role:
- Answer questions about their ideas thoughtfully and specifically
- Find patterns, tensions, and hidden connections between ideas  
- Challenge assumptions and offer fresh perspectives
- Be concise but insightful — think like a brilliant friend, not a textbook
- Always reference specific ideas by title or content when relevant
- When asked to suggest something, be concrete and actionable

The user has ${allIdeas.length} idea${allIdeas.length !== 1 ? 's' : ''} across ${Object.keys(allFolders).length} folder${Object.keys(allFolders).length !== 1 ? 's' : ''}.

=== IDEA LIBRARY ===

${ideaBlocks}

=== END OF LIBRARY ===

Ground every response in the actual ideas above. Quote or paraphrase them specifically when relevant.`;
  }

  // ─── Send a message ──────────────────────────────────────────────────────────

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) {
      Alert.alert(
        'API Key Missing',
        'Add EXPO_PUBLIC_OPENAI_API_KEY to your .env to use the AI assistant.'
      );
      return;
    }

    setInput('');
    setLoading(true);

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    const history = [...messages, userMsg];
    setMessages(history);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 700,
          temperature: 0.7,
          messages: [
            { role: 'system', content: buildSystemPrompt() },
            ...history.map(m => ({ role: m.role, content: m.content })),
          ],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content?.trim() ?? 'No response received.';

      setMessages(prev => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', content: reply, timestamp: Date.now() },
      ]);
    } catch (e: any) {
      setMessages(prev => [
        ...prev,
        { id: `e-${Date.now()}`, role: 'assistant', content: `⚠️ ${e.message}`, timestamp: Date.now() },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }

  // ─── Save AI response to an idea ────────────────────────────────────────────

  function openSave(content: string, msgId: string) {
    setSelectedIdeaId(allIdeas.sort((a, b) => b.createdAt - a.createdAt)[0]?.id ?? null);
    setSaveModal({ content, msgId });
  }

  function confirmSave() {
    if (!saveModal || !selectedIdeaId) return;
    const idea = ideas[selectedIdeaId];
    if (!idea) return;

    const date = new Date().toLocaleDateString();
    updateIdea(selectedIdeaId, {
      content: `${idea.content}\n\n── AI Note (${date}) ──\n${saveModal.content}`,
    });

    setMessages(prev =>
      prev.map(m => m.id === saveModal.msgId ? { ...m, savedToIdeaId: selectedIdeaId } : m)
    );
    setSaveModal(null);
    Alert.alert('Saved', `Added to "${idea.title || idea.content.slice(0, 40)}"`);
  }

  // ─── Clear conversation ──────────────────────────────────────────────────────

  function clearChat() {
    Alert.alert('Clear conversation?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setMessages([]) },
    ]);
  }

  // ─── Message bubble ──────────────────────────────────────────────────────────

  function renderMessage({ item }: { item: Message }) {
    const isUser = item.role === 'user';
    return (
      <View style={[s.row, isUser ? s.rowUser : s.rowAssistant]}>

        {!isUser && (
          <View style={s.avatar}>
            <Ionicons name="sparkles" size={13} color={C.accent} />
          </View>
        )}

        <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAssistant]}>
          <Text style={[s.bubbleText, isUser && s.bubbleTextUser]}>
            {item.content}
          </Text>

          {/* Save button on assistant messages */}
          {!isUser && (
            <View style={s.actions}>
              {item.savedToIdeaId ? (
                <View style={s.savedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={C.green} />
                  <Text style={s.savedText}>
                    Saved to "{ideas[item.savedToIdeaId]?.title || ideas[item.savedToIdeaId]?.content?.slice(0, 25) || 'idea'}"
                  </Text>
                </View>
              ) : (
                <TouchableOpacity style={s.saveBtn} onPress={() => openSave(item.content, item.id)}>
                  <Ionicons name="bookmark-outline" size={12} color={C.accent} />
                  <Text style={s.saveBtnText}>Save to idea</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {isUser && (
          <View style={[s.avatar, s.avatarUser]}>
            <Ionicons name="person" size={13} color="#fff" />
          </View>
        )}
      </View>
    );
  }

  // ─── Welcome screen ──────────────────────────────────────────────────────────

  function Welcome() {
    return (
      <View style={s.welcome}>
        <View style={s.welcomeIcon}>
          <Ionicons name="sparkles" size={28} color={C.accent} />
        </View>
        <Text style={s.welcomeTitle}>Your AI Brain</Text>
        <Text style={s.welcomeSub}>
          Ask anything about your {allIdeas.length} idea{allIdeas.length !== 1 ? 's' : ''}.{'\n'}
          Find patterns, connections, and new directions.
        </Text>
        <View style={s.chips}>
          {SUGGESTIONS.map((q, i) => (
            <TouchableOpacity key={i} style={s.chip} onPress={() => send(q)}>
              <Text style={s.chipText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>AI Assistant</Text>
          <Text style={s.headerSub}>{allIdeas.length} ideas loaded into context</Text>
        </View>
        {messages.length > 0 && (
          <TouchableOpacity onPress={clearChat} style={s.clearBtn}>
            <Ionicons name="trash-outline" size={18} color={C.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Message list */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={renderMessage}
        contentContainerStyle={[s.list, messages.length === 0 && { flex: 1 }]}
        ListEmptyComponent={<Welcome />}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Typing indicator */}
      {loading && (
        <View style={s.typingRow}>
          <View style={s.avatar}>
            <Ionicons name="sparkles" size={13} color={C.accent} />
          </View>
          <View style={s.typingBubble}>
            <ActivityIndicator size="small" color={C.muted} />
            <Text style={s.typingText}>Thinking…</Text>
          </View>
        </View>
      )}

      {/* Input */}
      <View style={[s.bar, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={s.input}
          placeholder="Ask about your ideas…"
          placeholderTextColor={C.muted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnOff]}
          onPress={() => send()}
          disabled={!input.trim() || loading}
        >
          <Ionicons name="arrow-up" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── Save-to-idea modal ── */}
      <Modal
        visible={!!saveModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSaveModal(null)}
      >
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setSaveModal(null)}>
              <Text style={s.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>Save to Idea</Text>
            <TouchableOpacity onPress={confirmSave} disabled={!selectedIdeaId}>
              <Text style={[s.modalSave, !selectedIdeaId && { opacity: 0.4 }]}>Save</Text>
            </TouchableOpacity>
          </View>

          {/* Preview */}
          <View style={s.preview}>
            <Text style={s.previewLabel}>Response to save:</Text>
            <Text style={s.previewText} numberOfLines={4}>{saveModal?.content}</Text>
          </View>

          <Text style={s.pickLabel}>Append to which idea?</Text>

          <FlatList
            data={allIdeas.sort((a, b) => b.createdAt - a.createdAt)}
            keyExtractor={i => i.id}
            renderItem={({ item }) => {
              const selected = selectedIdeaId === item.id;
              return (
                <TouchableOpacity
                  style={[s.ideaRow, selected && s.ideaRowSelected]}
                  onPress={() => setSelectedIdeaId(item.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.ideaRowTitle} numberOfLines={1}>
                      {item.title || item.content.slice(0, 55)}
                    </Text>
                    <Text style={s.ideaRowFolder}>
                      {allFolders[item.folderId]?.name ?? 'Uncategorized'}
                    </Text>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={22} color={C.accent} />}
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: C.text },
  headerSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  clearBtn: { padding: 6 },

  list: { padding: 16 },

  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 14 },
  rowUser: { justifyContent: 'flex-end' },
  rowAssistant: { justifyContent: 'flex-start' },

  avatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  avatarUser: { backgroundColor: C.accent },

  bubble: { maxWidth: '78%', borderRadius: 18, padding: 13, gap: 8 },
  bubbleUser: { backgroundColor: C.userBubble, borderBottomRightRadius: 4 },
  bubbleAssistant: {
    backgroundColor: C.surface, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: C.border,
  },
  bubbleText: { fontSize: 15, color: C.sub, lineHeight: 23 },
  bubbleTextUser: { color: C.text },

  actions: {},
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1, borderColor: C.accentDim, alignSelf: 'flex-start',
  },
  saveBtnText: { fontSize: 12, color: C.accent, fontWeight: '500' },
  savedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  savedText: { fontSize: 11, color: C.green },

  typingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingBottom: 8,
  },
  typingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.surface, borderRadius: 18,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: C.border,
  },
  typingText: { fontSize: 14, color: C.muted },

  bar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 14, paddingTop: 10,
    backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border,
  },
  input: {
    flex: 1, backgroundColor: C.surface, borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 11,
    color: C.text, fontSize: 15, maxHeight: 120,
    borderWidth: 1, borderColor: C.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnOff: { backgroundColor: C.surfaceAlt },

  // Welcome
  welcome: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24, paddingBottom: 32,
  },
  welcomeIcon: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  welcomeTitle: { fontSize: 22, fontWeight: '700', color: C.text, marginBottom: 8 },
  welcomeSub: {
    fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 22, marginBottom: 28,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  chip: {
    backgroundColor: C.surface, borderRadius: 20,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  chipText: { fontSize: 13, color: C.sub },

  // Modal
  modal: { flex: 1, backgroundColor: '#121212' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  modalTitle: { fontSize: 17, fontWeight: '600', color: C.text },
  modalCancel: { fontSize: 16, color: C.sub },
  modalSave: { fontSize: 16, color: C.accent, fontWeight: '600' },

  preview: {
    margin: 16, padding: 14, backgroundColor: C.surface,
    borderRadius: 12, borderWidth: 1, borderColor: C.border, gap: 6,
  },
  previewLabel: {
    fontSize: 11, color: C.muted, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  previewText: { fontSize: 13, color: C.sub, lineHeight: 20 },

  pickLabel: {
    fontSize: 12, fontWeight: '600', color: C.muted,
    paddingHorizontal: 18, paddingBottom: 8,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  ideaRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border, gap: 12,
  },
  ideaRowSelected: { backgroundColor: '#1C0C05' },
  ideaRowTitle: { fontSize: 15, color: C.text, fontWeight: '500' },
  ideaRowFolder: { fontSize: 12, color: C.muted, marginTop: 2 },
});