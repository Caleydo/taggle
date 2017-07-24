/**
 * Created by Martin on 24.07.2017.
 */
import {ITreeObserver, MyEvent} from '../model/TreeModel';
import InnerNode from '../tree/InnerNode';

export default class Tree implements ITreeObserver {
  //private root: InnerNode;
  update(e: MyEvent.Event): void {
    console.log(e);
  }

  build() {
    // build tree here
    return new InnerNode('ss');
  }

}
