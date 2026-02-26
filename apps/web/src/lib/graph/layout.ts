/**
 * Graph layout engine for the learning map.
 * Positions nodes in domain-based clusters with a radial arrangement.
 * No external dependencies.
 */

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface TopicNode {
  slug: string;
  nombre: string;
  emoji: string;
  dominio: string;
  veces: number;
  /** Is this a suggestion rather than completed? */
  isSuggestion: boolean;
  tipo?: 'profundizar' | 'conectar' | 'aplicar' | 'reforzar';
  motivo?: string;
}

export interface PositionedNode extends TopicNode {
  x: number;
  y: number;
  radius: number;
}

export interface DomainCluster {
  dominio: string;
  nombre: string;
  emoji: string;
  color: string;
  centerX: number;
  centerY: number;
  nodes: PositionedNode[];
}

export interface GraphLayout {
  nodes: PositionedNode[];
  clusters: DomainCluster[];
  /** Edges connecting nodes within the same domain */
  intraEdges: Array<{ from: string; to: string; dominio: string }>;
  /** Dashed edges from most-recent node to suggestions */
  suggestionEdges: Array<{ from: string; to: string }>;
  /** Canvas dimensions needed to contain the layout */
  width: number;
  height: number;
}

// ─────────────────────────────────────────────
// Domain color palette
// ─────────────────────────────────────────────

const DOMAIN_COLORS: Record<string, string> = {
  ciencia: '#4ECDC4',
  historia: '#FF6B6B',
  arte: '#D4880B',
  naturaleza: '#7BC67E',
  tecnologia: '#6C8EBF',
  cuentos: '#C78FD6',
  deportes: '#FF9F43',
  musica: '#F9A8D4',
  geografia: '#5BA4CF',
  cultura: '#E8915C',
  cocina: '#F0B429',
  animales: '#66BB6A',
  espacio: '#7E57C2',
  matematicas: '#42A5F5',
};

const DEFAULT_COLOR = '#9AA0A6';

export function getDomainColor(dominio: string): string {
  return DOMAIN_COLORS[dominio.toLowerCase()] ?? DEFAULT_COLOR;
}

// ─────────────────────────────────────────────
// Node radius based on study frequency
// ─────────────────────────────────────────────

/** Returns node radius (px in graph space) based on times studied */
function nodeRadius(veces: number, isSuggestion: boolean): number {
  if (isSuggestion) return 22;
  // Base 24, grows logarithmically. Max ~40.
  return Math.min(40, 24 + Math.log2(Math.max(1, veces)) * 5);
}

// ─────────────────────────────────────────────
// Layout algorithm
// ─────────────────────────────────────────────

export function computeGraphLayout(
  completedTopics: Array<{
    slug: string;
    nombre: string;
    emoji: string;
    dominio: string;
    fecha: string;
    veces: number;
  }>,
  suggestions: Array<{
    slug: string;
    nombre: string;
    emoji: string;
    dominio: string;
    tipo: 'profundizar' | 'conectar' | 'aplicar' | 'reforzar';
    motivo: string;
  }>,
  dominiosTocados: Array<{
    dominio: string;
    nombre: string;
    emoji: string;
  }>,
): GraphLayout {
  // Build unified node list
  const allNodes: TopicNode[] = [
    ...completedTopics.map((t) => ({
      slug: t.slug,
      nombre: t.nombre,
      emoji: t.emoji,
      dominio: t.dominio,
      veces: t.veces,
      isSuggestion: false,
    })),
    ...suggestions.map((s) => ({
      slug: s.slug,
      nombre: s.nombre,
      emoji: s.emoji,
      dominio: s.dominio,
      veces: 0,
      isSuggestion: true,
      tipo: s.tipo,
      motivo: s.motivo,
    })),
  ];

  if (allNodes.length === 0) {
    return { nodes: [], clusters: [], intraEdges: [], suggestionEdges: [], width: 600, height: 400 };
  }

  // Group by domain
  const domainGroups = new Map<string, TopicNode[]>();
  for (const node of allNodes) {
    const key = node.dominio;
    if (!domainGroups.has(key)) domainGroups.set(key, []);
    domainGroups.get(key)!.push(node);
  }

  // Domain metadata lookup
  const domainMeta = new Map(dominiosTocados.map((d) => [d.dominio, d]));

  const domainKeys = Array.from(domainGroups.keys());
  const numDomains = domainKeys.length;

  // Cluster positioning: arrange domains in a radial layout
  // For 1 domain, center it. For 2, side by side. For 3+, radial.
  const mapCenterX = 400;
  const mapCenterY = 350;
  const orbitRadius = numDomains <= 1 ? 0 : numDomains <= 3 ? 180 : 160 + numDomains * 20;

  const clusterCenters = new Map<string, { x: number; y: number }>();

  if (numDomains === 1) {
    clusterCenters.set(domainKeys[0], { x: mapCenterX, y: mapCenterY });
  } else if (numDomains === 2) {
    clusterCenters.set(domainKeys[0], { x: mapCenterX - 100, y: mapCenterY });
    clusterCenters.set(domainKeys[1], { x: mapCenterX + 100, y: mapCenterY });
  } else {
    for (let i = 0; i < numDomains; i++) {
      const angle = (2 * Math.PI * i) / numDomains - Math.PI / 2; // start from top
      const x = mapCenterX + orbitRadius * Math.cos(angle);
      const y = mapCenterY + orbitRadius * Math.sin(angle);
      clusterCenters.set(domainKeys[i], { x, y });
    }
  }

  // Position nodes within each cluster in a compact arrangement
  const positioned: PositionedNode[] = [];
  const clusters: DomainCluster[] = [];

  for (const [dominio, nodes] of domainGroups.entries()) {
    const center = clusterCenters.get(dominio)!;
    const meta = domainMeta.get(dominio);
    const color = getDomainColor(dominio);
    const clusterNodes: PositionedNode[] = [];

    // Sort: completed first (by veces desc), then suggestions
    const sorted = [...nodes].sort((a, b) => {
      if (a.isSuggestion !== b.isSuggestion) return a.isSuggestion ? 1 : -1;
      return b.veces - a.veces;
    });

    if (sorted.length === 1) {
      // Single node, place at center
      const n = sorted[0];
      const r = nodeRadius(n.veces, n.isSuggestion);
      const p: PositionedNode = { ...n, x: center.x, y: center.y, radius: r };
      clusterNodes.push(p);
    } else {
      // Place first (most studied) node at cluster center
      // Then arrange others in concentric rings
      const placed: Array<{ x: number; y: number; radius: number }> = [];

      for (let i = 0; i < sorted.length; i++) {
        const n = sorted[i];
        const r = nodeRadius(n.veces, n.isSuggestion);

        if (i === 0) {
          const p: PositionedNode = { ...n, x: center.x, y: center.y, radius: r };
          clusterNodes.push(p);
          placed.push({ x: center.x, y: center.y, radius: r });
        } else {
          // Find a position that doesn't overlap
          const pos = findNonOverlappingPosition(center, placed, r, i, sorted.length, n.isSuggestion);
          const p: PositionedNode = { ...n, x: pos.x, y: pos.y, radius: r };
          clusterNodes.push(p);
          placed.push({ x: pos.x, y: pos.y, radius: r });
        }
      }
    }

    positioned.push(...clusterNodes);
    clusters.push({
      dominio,
      nombre: meta?.nombre ?? dominio,
      emoji: meta?.emoji ?? '',
      color,
      centerX: center.x,
      centerY: center.y,
      nodes: clusterNodes,
    });
  }

  // Build intra-domain edges (connect sequential completed nodes within domain)
  const intraEdges: GraphLayout['intraEdges'] = [];
  for (const cluster of clusters) {
    const completed = cluster.nodes.filter((n) => !n.isSuggestion);
    for (let i = 0; i < completed.length - 1; i++) {
      intraEdges.push({
        from: completed[i].slug,
        to: completed[i + 1].slug,
        dominio: cluster.dominio,
      });
    }
  }

  // Suggestion edges are computed dynamically in the component based on
  // the focused (clicked) topic node, so we return an empty array here.
  const suggestionEdges: GraphLayout['suggestionEdges'] = [];

  // Compute bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of positioned) {
    minX = Math.min(minX, n.x - n.radius - 40);
    minY = Math.min(minY, n.y - n.radius - 50);
    maxX = Math.max(maxX, n.x + n.radius + 40);
    maxY = Math.max(maxY, n.y + n.radius + 40);
  }

  // Add padding for cluster labels
  minY -= 30;
  maxY += 30;

  const width = Math.max(600, maxX - minX + 80);
  const height = Math.max(400, maxY - minY + 80);

  // Shift all positions so the top-left is at ~(40,40).
  // INTENTIONAL: positioned[] and clusters[].nodes[] share object references,
  // so mutating positioned[] also updates cluster node positions.
  const offsetX = 40 - minX;
  const offsetY = 40 - minY;
  for (const n of positioned) {
    n.x += offsetX;
    n.y += offsetY;
  }
  for (const c of clusters) {
    c.centerX += offsetX;
    c.centerY += offsetY;
  }

  return { nodes: positioned, clusters, intraEdges, suggestionEdges, width, height };
}

// ─────────────────────────────────────────────
// Non-overlapping placement helper
// ─────────────────────────────────────────────

function findNonOverlappingPosition(
  center: { x: number; y: number },
  existing: Array<{ x: number; y: number; radius: number }>,
  radius: number,
  index: number, // Used in fallback placement only
  total: number, // Used in fallback placement only
  isSuggestion: boolean,
): { x: number; y: number } {
  // Suggestions are placed further out
  const baseDistance = isSuggestion ? 80 : 55;
  const ringGap = 50;

  // Try placing on concentric rings, increasing distance
  for (let ring = 0; ring < 5; ring++) {
    const distance = baseDistance + ring * ringGap;
    const spotsOnRing = Math.max(6, Math.floor((2 * Math.PI * distance) / (radius * 2.5)));

    // Offset angle per ring to stagger nodes
    const angleOffset = ring * 0.3;

    for (let s = 0; s < spotsOnRing; s++) {
      const angle = (2 * Math.PI * s) / spotsOnRing + angleOffset;
      const x = center.x + distance * Math.cos(angle);
      const y = center.y + distance * Math.sin(angle);

      // Check for overlap
      let overlaps = false;
      for (const ex of existing) {
        const dx = x - ex.x;
        const dy = y - ex.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = radius + ex.radius + 12; // 12px gap
        if (dist < minDist) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        return { x, y };
      }
    }
  }

  // Fallback: place at an angle based on index
  const angle = (2 * Math.PI * index) / total;
  const fallbackDist = baseDistance + 60;
  return {
    x: center.x + fallbackDist * Math.cos(angle),
    y: center.y + fallbackDist * Math.sin(angle),
  };
}
