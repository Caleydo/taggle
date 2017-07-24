/**
 * Created by Martin on 24.07.2017.
 */
import {ITreeObserver, TreeEvent} from '../model/TreeModel';
import {InnerNode} from '../tree';
import TreeModel from '../model/TreeModel';

export default class Tree implements ITreeObserver {
  private root: InnerNode;
  update(e: TreeEvent): void {
    console.log(e);
  }

  public initFromExistingTree(root: InnerNode, treeModel: TreeModel) {
    treeModel.nodesAdded(null, [root], this);
    this.root = root;
  }

  public get Root() {
    return this.root;
  }

}
