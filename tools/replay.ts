import { createRun, LEVELS } from '../src/game/content';
import { applyCommand } from '../src/game/simulation';
import type { Command, Resource, Session, Tool } from '../src/game/types';

export function winningReplay(
  level = 0,
  variant: 'standard' | 'reverse' | 'rebuild' | 'early-fold' = 'standard'
) {
  let session: Session = { state: createRun(level), undo: null };
  const commands: Command[] = [];
  const send = (c: Command) => {
    const r = applyCommand(session, c);
    if (r.error) throw new Error(`Level ${level + 1}: ${JSON.stringify(c)}: ${r.error}`);
    session = r.session;
    commands.push(c);
  };
  const place = (kind: Tool, x: number, y: number, rotation = 0) =>
    send({ type: 'place', kind, x, y, rotation });
  const until = (resource?: Resource) => {
    let safety = 100;
    while (
      session.state.status === 'playing' &&
      (resource
        ? session.state.orders.some((o) => o.resource === resource && o.delivered < o.quantity)
        : true) &&
      safety--
    )
      send({ type: 'run' });
    if (session.state.status === 'lost')
      throw new Error(`Level ${level + 1} exhausted: ${JSON.stringify(session.state.orders)}`);
  };
  if (level === 0) {
    place('punch', 0, 2);
  }
  if (level === 1) {
    place('straight', 3, 0, 1);
    place('punch', 1, 2, 1);
  }
  if (level === 2) {
    if (variant === 'reverse') {
      place('cutter', 0, 1);
      place('punch', 3, 1);
    } else {
      place('punch', 0, 1);
      place('cutter', 2, 3);
    }
  }
  if (level === 3) {
    place('punch', 0, 2);
    until('punched');
    send({ type: 'fold', id: 1, x: 0, y: 2, rotation: 0 });
    place('cutter', 1, 2);
  }
  if (level === 4) {
    place('punch', 0, 1);
    if (variant === 'early-fold') {
      place('cutter', 5, 5, 2);
      place('cutter', 1, 1);
      send({ type: 'fold', id: 1, x: 0, y: 1, rotation: 0 });
    } else if (variant === 'rebuild') {
      until('punched');
      send({ type: 'fold', id: 1, x: 0, y: 1, rotation: 0 });
      place('cutter', 1, 1);
      until('combined');
      // Completed product in the cutter's buffer cannot disappear. Recycle explicitly.
      send({ type: 'recycle', id: 3 });
      place('cutter', 5, 5, 2);
    } else {
      place('cutter', 5, 5, 2);
      until('punched');
      until('clipped');
      send({ type: 'fold', id: 1, x: 0, y: 1, rotation: 0 });
      place('cutter', 1, 1);
    }
  }
  if (level === 5) {
    place('elbow', 0, 0);
    place('cutter', 2, 1);
  }
  if (level === 6) {
    place('straight', 0, 2);
    until('clipped');
    place('punch', 2, 2);
  }
  if (level === 7) {
    send({ type: 'move', id: 1, x: 0, y: 2, rotation: 0 });
    send({ type: 'move', id: 2, x: 2, y: 4, rotation: 0 });
  }
  if (level === 8) {
    place('straight', 0, 1);
    place('straight', 6, 6, 2);
    until('clipped');
    until('punched');
    if (variant === 'reverse') place('cutter', 3, 5, 2);
    else place('punch', 2, 1);
  }
  if (level === 9) {
    const reverse = variant === 'reverse';
    place(reverse ? 'cutter' : 'punch', 0, 2);
    until(reverse ? 'clipped' : 'punched');
    send({ type: 'fold', id: 1, x: 0, y: 2, rotation: 0 });
    place(reverse ? 'punch' : 'cutter', 1, 2);
    until('combined');
    send({ type: 'fold', id: 3, x: 5, y: 6, rotation: 0 });
    place(reverse ? 'punch' : 'cutter', 0, 2);
  }
  until();
  if (session.state.status !== 'won') throw new Error('Replay did not win');
  return { session, commands };
}
if (process.argv[1]?.endsWith('replay.ts')) {
  for (let l = 0; l < LEVELS.length; l++) {
    const { session, commands } = winningReplay(l);
    console.log(
      `${l + 1}. ${LEVELS[l].name}: won in ${LEVELS[l].actions - session.state.actions}/${LEVELS[l].actions} paid actions, ${commands.length} commands, ${session.state.spaceRecovered} cells recovered`
    );
  }
  for (const [l, v] of [
    [2, 'reverse'],
    [4, 'rebuild'],
    [4, 'early-fold'],
    [8, 'reverse'],
    [9, 'reverse'],
  ] as const) {
    const { session } = winningReplay(l, v);
    console.log(
      `Alternative ${l + 1}/${v}: won in ${LEVELS[l].actions - session.state.actions} actions`
    );
  }
}
