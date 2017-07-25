import {INode} from '../tree';
// todo use already existing Event class (phovea_core event?)
export class TreeEvent {
  constructor(public parent: INode | null, public leaves: INode[], public sender: any) {

  }
}

export interface ITreeObserver {
    update(e: TreeEvent): void;
  }

/** Stores all tree listeners and delegates events */
export default class TreeModel {
  private listeners = new Array<ITreeObserver>();

  addListener(obs: ITreeObserver) {
    this.listeners.push(obs);
  }

  private notify(event: TreeEvent) {
    this.listeners.forEach((l) => l.update(event));
  }

  nodesAdded(parent: INode | null, leaves: INode[], sender: any) {
    const event = new TreeEvent(parent, leaves, sender);
    this.notify(event);
  }
}
