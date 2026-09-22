export type Resource = 'blank' | 'punched' | 'clipped' | 'combined';
export type Kind = 'punch' | 'cutter' | 'straight' | 'elbow' | 'module';
export type Tool = Exclude<Kind, 'module'>;
export type Direction = 0 | 1 | 2 | 3; // north, east, south, west
export interface Point {
  x: number;
  y: number;
}
export interface Port extends Point {
  direction: Direction;
  resource: Resource | 'any';
  index: number;
}
export interface Definition {
  name: string;
  cells: Point[];
  inputs: Port[];
  output: Port;
  color: number;
  duration: number;
  description: string;
}
export interface Endpoint {
  id: number;
  port: number;
}
export interface Edge {
  from: number;
  to: Endpoint;
}
export interface Machine {
  id: number;
  kind: Kind;
  x: number;
  y: number;
  rotation: number;
  inputs: Resource[][];
  output: Resource[];
  remaining: number;
  processing: Resource | null;
  emitted: number;
  folded?: FoldedGraph;
}
export interface FoldedGraph {
  machines: Machine[];
  edges: Edge[];
  inputs: { endpoint: Endpoint; resource: Resource | 'any' }[];
  output: number;
  resource: Resource | 'any';
}
export interface Source extends Point {
  id: number;
  direction: Direction;
  resource: Resource;
}
export interface Order {
  resource: Resource;
  quantity: number;
  delivered: number;
}
export interface RunState {
  version: 2;
  level: number;
  mirrored: boolean;
  machines: Machine[];
  sources: Source[];
  blockers: Point[];
  orders: Order[];
  actions: number;
  tick: number;
  status: 'playing' | 'won' | 'lost';
  nextId: number;
  spaceRecovered: number;
  folds: number;
}
export interface Session {
  state: RunState;
  undo: RunState | null;
}
export type Command =
  | { type: 'place'; kind: Tool; x: number; y: number; rotation: number }
  | { type: 'move'; id: number; x: number; y: number; rotation: number }
  | { type: 'fold'; id: number; x: number; y: number; rotation: number }
  | { type: 'recycle'; id: number }
  | { type: 'run' }
  | { type: 'undo' };
export interface SimEvent {
  type: 'flow' | 'work' | 'ship' | 'milestone' | 'fold' | 'place';
  id?: number;
  to?: number;
  resource?: Resource;
  amount?: number;
  tick?: number;
  fromPoint?: Point;
}
export interface Result {
  session: Session;
  events: SimEvent[];
  error?: string;
}
export interface FoldPreview {
  ids: number[];
  graph: FoldedGraph;
  saved: number;
  error?: string;
}
