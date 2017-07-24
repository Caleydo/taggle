export namespace MyEvent {
  // todo use already existing Event class (phovea_core event?)
  export class Event {

  }
}


export interface ITreeObserver {
    update(e: MyEvent.Event): void;
  }

/** Stores all tree listeners and delegates events */
export default class TreeModel {
  private listeners = new Array<ITreeObserver>();
  changed() {
    this.notify();
  }

  addListener(obs: ITreeObserver) {
    this.listeners.push(obs);
  }

  private notify() {
    const event = new MyEvent.Event();
    this.listeners.forEach((l) => l.update(event));
  }
}

