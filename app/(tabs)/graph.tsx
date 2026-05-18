import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Circle, G, Line, Svg, Text as SvgText } from 'react-native-svg';
import FolderModal from '../../components/FolderModal';
import { FOLDER_COLORS, useAppStore } from '../../store/useAppStore';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Canvas config ────────────────────────────────────────────────────────────
const NODE_R = 28;
const CANVAS_W = SCREEN_W * 2.8;
const CANVAS_H = SCREEN_H * 2.8;
const INITIAL_ZOOM = 0.68;

// ─── Module-level position memory (survives re-renders + tab switches) ────────
const posMemory = new Map<string, { x: number; y: number }>();

interface GraphNode {
  id: string;
  label: string;
  color: string;
  connections: string[];
  x: number;
  y: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function seedPosition(id: string, index: number): { x: number; y: number } {
  const h = hashCode(id);
  // Golden-angle spiral so nodes don't all stack at center
  const angle = index * 2.39996 + (h % 100) * 0.01;
  const radius = 90 + index * 45 + (h % 70);
  return {
    x: CANVAS_W / 2 + Math.cos(angle) * radius,
    y: CANVAS_H / 2 + Math.sin(angle) * radius,
  };
}

function centeredPan(z: number) {
  return {
    x: (SCREEN_W - CANVAS_W * z) / 2,
    y: (SCREEN_H - CANVAS_H * z) / 2 - 60,
  };
}

// Convert a screen touch coordinate → canvas coordinate
function toCanvas(
  screenX: number,
  screenY: number,
  pan: { x: number; y: number },
  zoom: number,
) {
  return {
    cx: (screenX - pan.x) / zoom,
    cy: (screenY - pan.y) / zoom,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function GraphScreen() {
  const insets = useSafeAreaInsets();
  const {
    ideas, folders, edges: storeEdges,
    getFolderTree, selectedFolderIds, selectFolderMulti,
    connectIdeas, disconnectIdeas, deleteIdea,
    searchQuery,
  } = useAppStore();

  const [showFolderModal, setShowFolderModal] = useState(false);

  // ── Node render state ─────────────────────────────────────────────────────
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const nodesRef = useRef<GraphNode[]>([]);

  // ── Interaction state (all in refs to avoid stale closures in PRs) ─────────
  //   State only for things that need to trigger a render
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isConnectMode, setIsConnectMode] = useState(false);
  const [connectSource, setConnectSource] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Mirror interaction state in refs so PanResponder callbacks always see current values
  const selectedNodeIdRef = useRef<string | null>(null);
  const isConnectModeRef = useRef(false);
  const connectSourceRef = useRef<string | null>(null);

  // Keep refs in sync
  const syncSelectedNode = (id: string | null) => {
    selectedNodeIdRef.current = id;
    setSelectedNodeId(id);
  };
  const syncConnectMode = (on: boolean) => {
    isConnectModeRef.current = on;
    setIsConnectMode(on);
  };
  const syncConnectSource = (id: string | null) => {
    connectSourceRef.current = id;
    setConnectSource(id);
  };

  // ── Drag state ────────────────────────────────────────────────────────────
  const draggingIdRef = useRef<string | null>(null);  // never causes re-render
  const didDragRef = useRef(false);

  // ── Zoom / pan ────────────────────────────────────────────────────────────
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const [pan, setPan] = useState(() => centeredPan(INITIAL_ZOOM));
  const zoomRef = useRef(INITIAL_ZOOM);
  const panRef = useRef(centeredPan(INITIAL_ZOOM));
  const basePan = useRef(panRef.current);
  const lastDist = useRef<number | null>(null);

  const rootFolders = getFolderTree().filter((f: any) => f.parentId === null);

  // ── Derived: which ideas are visible ─────────────────────────────────────
  const visibleIdeas = useMemo(() => {
    let list = Object.values(ideas);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i =>
        i.title?.toLowerCase().includes(q) ||
        i.content.toLowerCase().includes(q) ||
        i.source.toLowerCase().includes(q),
      );
    }
    if (selectedFolderIds.length > 0) {
      list = list.filter(i => selectedFolderIds.includes(i.folderId));
    }
    return list;
  }, [ideas, searchQuery, selectedFolderIds]);

  const visibleIdKey = visibleIdeas.map(i => i.id).sort().join(',');

  const visibleEdges = useMemo(() => {
    const vis = new Set(visibleIdeas.map(i => i.id));
    return storeEdges.filter(e => vis.has(e.sourceId) && vis.has(e.targetId));
  }, [storeEdges, visibleIdeas]);

  const nodeMap = useMemo(() => {
    const m = new Map<string, GraphNode>();
    nodes.forEach(n => m.set(n.id, n));
    return m;
  }, [nodes]);

  // ── Build / update nodes ──────────────────────────────────────────────────
  // Only re-seed positions when the set of visible ideas changes
  useEffect(() => {
    const prevMap = new Map(nodesRef.current.map(n => [n.id, n]));
    const next: GraphNode[] = visibleIdeas.map((idea, idx) => {
      const folder = folders[idea.folderId];
      const color = FOLDER_COLORS[folder?.colorKey ?? 'orange'];
      const label = idea.title || (idea.content.length > 22 ? idea.content.slice(0, 22) + '…' : idea.content);
      // Position priority: current render memory → drag memory → deterministic seed
      const pos =
        prevMap.get(idea.id) ??
        posMemory.get(idea.id) ??
        seedPosition(idea.id, idx);
      posMemory.set(idea.id, { x: pos.x, y: pos.y });
      return { id: idea.id, label, color, connections: idea.connections ?? [], x: pos.x, y: pos.y };
    });
    nodesRef.current = next;
    setNodes([...next]);
  }, [visibleIdKey, folders]);

  // Refresh connections list (edges changed) without moving nodes
  useEffect(() => {
    const next = nodesRef.current.map(n => ({
      ...n,
      connections: ideas[n.id]?.connections ?? n.connections,
    }));
    nodesRef.current = next;
    setNodes([...next]);
  }, [storeEdges]);

  // ── Node tap (called from PanResponder release when no drag happened) ──────
  // Reads from refs so it always sees current state even if the PR was built earlier
  const handleNodeTap = useCallback((id: string) => {
    console.log("CONNECT MODE:", isConnectModeRef.current);
    console.log("SOURCE:", connectSourceRef.current);
    console.log("TAPPED:", id);
    
    if (isConnectModeRef.current) {
      const src = connectSourceRef.current;
      if (!src) {
        // First tap: set source
        console.log("SETTING SOURCE TO:", id);
        syncConnectSource(id);
      } else if (src === id) {
        // Tapped source again: cancel
        console.log("CANCELING SOURCE SELECTION");
        syncConnectSource(null);
      } else {
        // Second tap: connect or disconnect
        const srcIdea = ideas[src];
        if (srcIdea?.connections.includes(id)) {
          console.log("DISCONNECTING:", src, "from", id);
          disconnectIdeas(src, id);
        } else {
          console.log("CONNECTING:", src, "to", id);
          connectIdeas(src, id);
        }
        syncConnectSource(null);
        syncConnectMode(false);
      }
      return;
    }

    // Normal selection
    if (selectedNodeIdRef.current === id) {
      setShowDetail(v => !v);
    } else {
      syncSelectedNode(id);
      setShowDetail(true);
    }
  }, [ideas, connectIdeas, disconnectIdeas]);

  const handleNodeLongPress = useCallback((id: string) => {
    const idea = ideas[id];
    if (!idea) return;
    Alert.alert(
      idea.content.slice(0, 50),
      'What do you want to do?',
      [
        { text: 'View details', onPress: () => router.push(`/idea/${id}`) },
        {
          text: 'Delete node', style: 'destructive',
          onPress: () => {
            deleteIdea(id);
            if (selectedNodeIdRef.current === id) {
              syncSelectedNode(null);
              setShowDetail(false);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }, [ideas, deleteIdea]);

  const handleEdgeLongPress = useCallback((srcId: string, tgtId: string) => {
    const a = ideas[srcId]?.content.slice(0, 22) ?? '…';
    const b = ideas[tgtId]?.content.slice(0, 22) ?? '…';
    Alert.alert(
      'Remove connection?',
      `"${a}" ↔ "${b}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => disconnectIdeas(srcId, tgtId) },
      ],
    );
  }, [ideas, disconnectIdeas]);

  // ── Per-node PanResponder ─────────────────────────────────────────────────
  // Cached so we don't rebuild on every render — each PR closes over its nodeId
  // and reads live values from refs for interaction logic.
  const nodePRCache = useRef(new Map<string, ReturnType<typeof PanResponder.create>>());

  const getNodePR = useCallback((id: string) => {
    const cached = nodePRCache.current.get(id);
    if (cached) return cached;

    // startX/Y = canvas position at the moment the finger lands
    let startX = 0, startY = 0;

    const pr = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      // Only claim move if we moved enough (prevents eating canvas pans)
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 10 || Math.abs(gs.dy) > 10,
      onMoveShouldSetPanResponderCapture: (_, gs) =>
        Math.abs(gs.dx) > 10 || Math.abs(gs.dy) > 10,

      onPanResponderGrant: () => {
        draggingIdRef.current = id;
        didDragRef.current = false;
        // Snapshot current canvas position from the ref (never stale)
        const n = nodesRef.current.find(x => x.id === id);
        if (n) { startX = n.x; startY = n.y; }
      },

      onPanResponderMove: (evt, gs) => {
        if (draggingIdRef.current !== id) return;

        if (Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5) {
          didDragRef.current = true;
        }

        // Convert screen touch → canvas coordinate using current pan/zoom refs
        const touch = evt.nativeEvent;
        const { cx, cy } = toCanvas(touch.pageX, touch.pageY, panRef.current, zoomRef.current);
        const nx = Math.max(NODE_R + 4, Math.min(CANVAS_W - NODE_R - 4, cx));
        const ny = Math.max(NODE_R + 4, Math.min(CANVAS_H - NODE_R - 4, cy));

        const next = nodesRef.current.map(n => n.id === id ? { ...n, x: nx, y: ny } : n);
        nodesRef.current = next;
        posMemory.set(id, { x: nx, y: ny });
        setNodes([...next]);
      },

      onPanResponderRelease: () => {
        const wasDrag = didDragRef.current;
        draggingIdRef.current = null;
        didDragRef.current = false;
        if (!wasDrag) {
          // It was a tap — fire tap handler (reads from refs, always current)
          handleNodeTap(id);
        }
      },

      onPanResponderTerminate: () => {
        draggingIdRef.current = null;
        didDragRef.current = false;
      },
    });

    nodePRCache.current.set(id, pr);
    return pr;
  }, [handleNodeTap]);

  // Evict PR cache entries for nodes that are no longer visible
  useEffect(() => {
    const currentIds = new Set(visibleIdeas.map(i => i.id));
    nodePRCache.current.forEach((_, k) => {
      if (!currentIds.has(k)) nodePRCache.current.delete(k);
    });
  }, [visibleIdKey]);

  // ── Canvas PanResponder (pan + pinch-to-zoom) ─────────────────────────────
  // Uses `onStartShouldSetPanResponderCapture: false` so node PRs take priority
  const canvasPR = useMemo(() => PanResponder.create({
    // Don't capture: let node PRs have first refusal
    onStartShouldSetPanResponderCapture: () => false,
    onMoveShouldSetPanResponderCapture: () => false,
    // Take the gesture only if no node is being dragged
    onStartShouldSetPanResponder: () => draggingIdRef.current === null,
    onMoveShouldSetPanResponder: () => draggingIdRef.current === null,

    onPanResponderGrant: (e) => {
      basePan.current = { ...panRef.current };
      lastDist.current = null;
      const touches = e.nativeEvent.touches;
      if (touches.length === 2) {
        const dx = touches[1].pageX - touches[0].pageX;
        const dy = touches[1].pageY - touches[0].pageY;
        lastDist.current = Math.hypot(dx, dy);
      }
    },

    onPanResponderMove: (e, gs) => {
      const touches = e.nativeEvent.touches;
      if (touches.length === 2) {
        // Pinch zoom
        const dx = touches[1].pageX - touches[0].pageX;
        const dy = touches[1].pageY - touches[0].pageY;
        const dist = Math.hypot(dx, dy);
        if (lastDist.current !== null) {
          const newZoom = Math.max(0.15, Math.min(3, zoomRef.current * (dist / lastDist.current)));
          zoomRef.current = newZoom;
          setZoom(newZoom);
        }
        lastDist.current = dist;
      } else {
        // Pan
        lastDist.current = null;
        const np = { x: basePan.current.x + gs.dx, y: basePan.current.y + gs.dy };
        panRef.current = np;
        setPan(np);
      }
    },

    onPanResponderRelease: () => { lastDist.current = null; },
    onPanResponderTerminate: () => { lastDist.current = null; },
  }), []); // stable — reads only from refs

  // ── Zoom buttons ──────────────────────────────────────────────────────────
  const zoomIn = () => {
    const z = Math.min(3, zoomRef.current * 1.3);
    zoomRef.current = z; setZoom(z);
  };
  const zoomOut = () => {
    const z = Math.max(0.15, zoomRef.current / 1.3);
    zoomRef.current = z; setZoom(z);
  };
  const resetView = () => {
    const z = INITIAL_ZOOM;
    const p = centeredPan(z);
    zoomRef.current = z; setZoom(z);
    panRef.current = p; basePan.current = p; setPan(p);
  };

  // ── Detail card animation ─────────────────────────────────────────────────
  const selectedIdea = selectedNodeId ? ideas[selectedNodeId] : null;
  const selectedFolder = selectedIdea ? folders[selectedIdea.folderId] : null;
  const selectedColor = selectedFolder ? FOLDER_COLORS[selectedFolder.colorKey] : '#EC5B13';
  const connectedIdeas = selectedIdea
    ? selectedIdea.connections.map(cid => ideas[cid]).filter(Boolean)
    : [];

  const cardAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(cardAnim, {
      toValue: showDetail && !!selectedIdea ? 1 : 0,
      useNativeDriver: true,
      tension: 90, friction: 12,
    }).start();
  }, [showDetail, selectedNodeId]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Graph</Text>
          <View style={styles.controls}>
            <TouchableOpacity style={styles.iconBtn} onPress={zoomIn}>
              <Text style={styles.iconTxt}>＋</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={zoomOut}>
              <Text style={styles.iconTxt}>－</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={resetView}>
              <Text style={styles.iconTxt}>⊙</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.connectBtn, isConnectMode && styles.connectActive]}
              onPress={() => {
                const next = !isConnectMode;
                syncConnectMode(next);
                syncConnectSource(null);
                if (!next) setShowDetail(false);
              }}
            >
              <Text style={[styles.connectTxt, isConnectMode && styles.connectTxtActive]}>
                {isConnectMode
                  ? (connectSource ? '→ Pick target' : '○ Pick source')
                  : 'Connect'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Folder filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <TouchableOpacity
            style={[styles.chip, selectedFolderIds.length === 0 && styles.chipAllOn]}
            onPress={() => selectFolderMulti(null)}
          >
            <Text style={[styles.chipTxt, selectedFolderIds.length === 0 && styles.chipTxtOn]}>All</Text>
          </TouchableOpacity>

          {rootFolders.map((f: any) => {
            const on = selectedFolderIds.includes(f.id);
            const col = FOLDER_COLORS[f.colorKey];
            return (
              <TouchableOpacity
                key={f.id}
                style={[styles.chip, on && { backgroundColor: col + '28', borderColor: col }]}
                onPress={() => selectFolderMulti(f.id)}
              >
                <View style={[styles.chipDot, { backgroundColor: col }]} />
                <Text style={[styles.chipTxt, on && { color: col, fontWeight: '700' }]}>{f.name}</Text>
                {on && <Text style={{ fontSize: 13, color: col, fontWeight: '700' }}>×</Text>}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity style={styles.chipNew} onPress={() => setShowFolderModal(true)}>
            <Text style={styles.chipNewTxt}>+ Folder</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Connect banner */}
      {isConnectMode && (
        <View style={styles.banner}>
          <Text style={styles.bannerTxt}>
            {connectSource
              ? `"${ideas[connectSource]?.content.slice(0, 30)}…"  →  tap another node`
              : 'Tap any node to start a connection'}
          </Text>
          <TouchableOpacity onPress={() => { syncConnectMode(false); syncConnectSource(null); }}>
            <Text style={styles.bannerCancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Canvas ───────────────────────────────────────────────────── */}
      <View style={styles.canvas} {...canvasPR.panHandlers}>
        <Svg
          width={SCREEN_W}
          height="100%"
          viewBox={`0 0 ${SCREEN_W} ${SCREEN_H}`}
          style={StyleSheet.absoluteFill}
        >
          {/* Single transform group — pan + zoom applied once here */}
          <G transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>

            {/* Edges */}
            {visibleEdges.map((edge: any) => {
              const a = nodeMap.get(edge.sourceId);
              const b = nodeMap.get(edge.targetId);
              if (!a || !b) return null;
              const hi = selectedNodeId === edge.sourceId || selectedNodeId === edge.targetId;
              return (
                <G key={edge.id}>
                  {/* Visible edge */}
                  <Line
                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke={hi ? '#EC5B13' : '#2D3550'}
                    strokeWidth={hi ? 3 / zoom : 1.5 / zoom}
                    strokeOpacity={hi ? 1 : 0.65}
                  />
                  {/* Fat invisible hit zone for long press (delete) */}
                  <Line
                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke="transparent"
                    strokeWidth={32 / zoom}
                    onLongPress={() => handleEdgeLongPress(edge.sourceId, edge.targetId)}
                  />
                </G>
              );
            })}

            {/* Nodes */}
            {nodes.map(node => {
              const pr = getNodePR(node.id);
              const isSel = selectedNodeId === node.id;
              const isSrc = connectSource === node.id;
              const r = isSel ? NODE_R + 4 : NODE_R;

              return (
                <G key={node.id} {...pr.panHandlers}>
                  {/* Glow ring for selected / connect source */}
                  {(isSel || isSrc) && (
                    <Circle
                      cx={node.x} cy={node.y} r={r + 12}
                      fill={isSrc ? '#F59E0B18' : node.color + '22'}
                      stroke={isSrc ? '#F59E0B' : node.color}
                      strokeWidth={1.5 / zoom}
                    />
                  )}

                  {/* Main circle */}
                  <Circle
                    cx={node.x} cy={node.y} r={r}
                    fill={isSrc ? '#F59E0B' : node.color}
                    stroke={isSel ? '#FFFFFF' : '#00000055'}
                    strokeWidth={(isSel ? 3 : 1.5) / zoom}
                    opacity={isSel ? 1 : 0.88}
                  />

                  {/* First-letter initial */}
                  <SvgText
                    x={node.x} y={node.y + 6}
                    fontSize={15 / zoom}
                    fontWeight="700"
                    fill="#FFFFFF"
                    textAnchor="middle"
                  >
                    {node.label.charAt(0).toUpperCase()}
                  </SvgText>

                  {/* Connection count badge */}
                  {node.connections.length > 0 && (
                    <>
                      <Circle
                        cx={node.x + NODE_R - 2} cy={node.y - NODE_R + 2}
                        r={10 / zoom * 0.9}
                        fill="#0A0A0F"
                      />
                      <SvgText
                        x={node.x + NODE_R - 2} y={node.y - NODE_R + 6}
                        fontSize={9 / zoom}
                        fontWeight="700"
                        fill="#EC5B13"
                        textAnchor="middle"
                      >
                        {node.connections.length}
                      </SvgText>
                    </>
                  )}

                  {/* Label below node */}
                  <SvgText
                    x={node.x} y={node.y + NODE_R + 16}
                    fontSize={11 / zoom}
                    fill={isSel ? '#F0F0F5' : '#666688'}
                    textAnchor="middle"
                  >
                    {node.label}
                  </SvgText>
                </G>
              );
            })}
          </G>
        </Svg>

        {/* Zoom level badge */}
        <View style={styles.zoomBadge} pointerEvents="none">
          <Text style={styles.zoomBadgeTxt}>{Math.round(zoom * 100)}%</Text>
        </View>

        {/* Empty state */}
        {nodes.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No ideas on the graph</Text>
            <Text style={styles.emptySub}>Add ideas from the Feed tab</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/create-idea')}>
              <Text style={styles.emptyBtnTxt}>+ Add Idea</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Detail card ──────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.card,
          { paddingBottom: insets.bottom + 12 },
          { transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [380, 0] }) }] },
        ]}
        pointerEvents={showDetail && !!selectedIdea ? 'auto' : 'none'}
      >
        {selectedIdea && (
          <>
            <View style={styles.cardTop}>
              <View style={styles.handle} />
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => { setShowDetail(false); syncSelectedNode(null); }}
              >
                <Text style={styles.closeTxt}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedFolder && (
              <View style={[styles.badge, { backgroundColor: selectedColor + '20' }]}>
                <View style={[styles.badgeDot, { backgroundColor: selectedColor }]} />
                <Text style={[styles.badgeTxt, { color: selectedColor }]}>{selectedFolder.name}</Text>
              </View>
            )}

            <Text style={styles.cardContent} numberOfLines={3}>{selectedIdea.content}</Text>
            {selectedIdea.source
              ? <Text style={styles.cardSource}>— {selectedIdea.source}</Text>
              : null}

            {connectedIdeas.length > 0 && (
              <View style={styles.connWrap}>
                <Text style={styles.connLabel}>CONNECTIONS  ·  long-press chip to remove</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  {connectedIdeas.map(ci => {
                    if (!ci) return null;
                    const col = FOLDER_COLORS[folders[ci.folderId]?.colorKey ?? 'orange'];
                    return (
                      <TouchableOpacity
                        key={ci.id}
                        style={styles.connChip}
                        onPress={() => { syncSelectedNode(ci.id); setShowDetail(true); }}
                        onLongPress={() => handleEdgeLongPress(selectedNodeId!, ci.id)}
                      >
                        <View style={[styles.connDot, { backgroundColor: col }]} />
                        <Text style={styles.connTxt} numberOfLines={1}>{ci.content.slice(0, 20)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.actPrimary} onPress={() => router.push(`/idea/${selectedNodeId}`)}>
                <Text style={styles.actPrimaryTxt}>View details</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actSecondary}
                onPress={() => {
                  syncConnectMode(true);
                  syncConnectSource(selectedNodeId!);
                  setShowDetail(false);
                }}
              >
                <Text style={styles.actSecondaryTxt}>Connect</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </Animated.View>

      {/* FAB */}
      {!showDetail && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 80 }]}
          onPress={() => router.push('/create-idea')}
        >
          <Text style={styles.fabTxt}>＋</Text>
        </TouchableOpacity>
      )}

      <FolderModal visible={showFolderModal} onClose={() => setShowFolderModal(false)} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0A0F' },

  topBar: {
    backgroundColor: '#0A0A0F',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#1E1E2E',
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#F0F0F5', letterSpacing: -0.5 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  iconBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#161622',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: '#2D2D40',
  },
  iconTxt: { color: '#8888AA', fontSize: 16, fontWeight: '600' },

  connectBtn: {
    borderWidth: 1, borderColor: '#2D2D40',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: '#161622',
  },
  connectActive: { borderColor: '#F59E0B', backgroundColor: '#F59E0B18' },
  connectTxt: { fontSize: 12, color: '#6666AA', fontWeight: '600' },
  connectTxtActive: { color: '#F59E0B' },

  chips: {
    paddingHorizontal: 16, paddingBottom: 2,
    gap: 7, alignItems: 'center', flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#161622', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#2D2D40', gap: 5,
  },
  chipAllOn: { backgroundColor: '#EC5B13', borderColor: '#EC5B13' },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipTxt: { fontSize: 12, color: '#6666AA', fontWeight: '500' },
  chipTxtOn: { color: '#fff', fontWeight: '700' },
  chipNew: {
    backgroundColor: '#161622', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#EC5B1366',
  },
  chipNewTxt: { fontSize: 12, color: '#EC5B13', fontWeight: '600' },

  banner: {
    backgroundColor: '#F59E0B0E',
    paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#F59E0B44',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  bannerTxt: { fontSize: 13, color: '#F59E0B', fontWeight: '500', flex: 1 },
  bannerCancel: { fontSize: 13, color: '#F59E0B', fontWeight: '700', paddingLeft: 12 },

  canvas: { flex: 1, backgroundColor: '#060608' },

  zoomBadge: {
    position: 'absolute', bottom: 12, left: 14,
    backgroundColor: '#161622CC', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: StyleSheet.hairlineWidth, borderColor: '#2D2D40',
  },
  zoomBadgeTxt: { fontSize: 11, color: '#6666AA', fontWeight: '600' },

  empty: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#F0F0F5', marginBottom: 6 },
  emptySub: { fontSize: 14, color: '#33334A', marginBottom: 24 },
  emptyBtn: {
    backgroundColor: '#EC5B13', borderRadius: 24,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  emptyBtnTxt: { color: '#fff', fontWeight: '600', fontSize: 14 },

  card: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#111118',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20,
    borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#1E1E2E',
    minHeight: 200,
  },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  handle: { width: 36, height: 4, backgroundColor: '#2D2D40', borderRadius: 2 },
  closeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#1E1E2E',
    alignItems: 'center', justifyContent: 'center',
  },
  closeTxt: { fontSize: 11, color: '#6666AA' },

  badge: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-start', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
    gap: 5, marginBottom: 10,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeTxt: { fontSize: 11, fontWeight: '600' },

  cardContent: { fontSize: 16, color: '#E8E8F0', lineHeight: 22, marginBottom: 4 },
  cardSource: { fontSize: 12, color: '#555570', fontStyle: 'italic', marginBottom: 12 },

  connWrap: { marginBottom: 14 },
  connLabel: { fontSize: 10, color: '#333355', fontWeight: '700', letterSpacing: 0.8 },
  connChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#161622', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    marginRight: 8, gap: 6,
    borderWidth: 1, borderColor: '#2D2D40',
    maxWidth: 150,
  },
  connDot: { width: 6, height: 6, borderRadius: 3 },
  connTxt: { fontSize: 12, color: '#8888AA' },

  cardActions: { flexDirection: 'row', gap: 10 },
  actPrimary: {
    flex: 1, backgroundColor: '#EC5B13',
    borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  actPrimaryTxt: { color: '#fff', fontWeight: '600', fontSize: 14 },
  actSecondary: {
    flex: 1, backgroundColor: '#161622',
    borderRadius: 10, paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#2D2D40',
  },
  actSecondaryTxt: { color: '#8888AA', fontWeight: '600', fontSize: 14 },

  fab: {
    position: 'absolute', right: 20,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#EC5B13',
    alignItems: 'center', justifyContent: 'center',
    elevation: 8,
  },
  fabTxt: { color: '#fff', fontSize: 24, fontWeight: '300', lineHeight: 28 },
});