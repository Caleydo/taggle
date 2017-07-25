import {INode, InnerNode, EAggregationType} from '../tree';
// todo use already existing Event class (phovea_core event?)

export enum EventType {
  NodeAdded, NodeRemoved, NodeAggregated, NodeUnaggregated
}

export class TreeEvent {
  constructor(public parent: INode | null, public node: INode, public sender: any, public eventType: EventType) {

  }
}

export interface ITreeObserver {
    update(e: TreeEvent): void;
  }

/** Stores all tree listeners and delegates events */
export default class TreeModel {
  private readonly listeners = new Array<ITreeObserver>();

  addListener(obs: ITreeObserver) {
    this.listeners.push(obs);
  }

  private notify(event: TreeEvent) {
    this.listeners.forEach((l) => l.update(event));
  }

  nodesAdded(parent: INode | null, nodes: INode[], sender: any) {
    nodes.forEach((n) => {
      const event = new TreeEvent(parent, n, sender, EventType.NodeAdded);
      this.notify(event);
    });
  }

  nodesChanged(nodes: InnerNode[], sender: any) {
    nodes.forEach((n) => {
      const e = n.aggregation === EAggregationType.AGGREGATED ? EventType.NodeAggregated : EventType.NodeUnaggregated;
      const event = new TreeEvent(null, n, sender, e);
      this.notify(event);
    });
  }
}

