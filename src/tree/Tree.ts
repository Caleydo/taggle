/**
 * Created by Martin on 24.07.2017.
 */
import {ITreeObserver, TreeEvent} from '../model/TreeModel';
import {InnerNode, LeafNode} from '../tree';
import TreeModel from '../model/TreeModel';
import {visit} from '../tree';
import {IRow} from '../data';

export default class Tree implements ITreeObserver {
  private root: InnerNode;
  update(e: TreeEvent): void {
    if(e.sender === this) {
      return;
    }
  }

  public initFromExistingTree(root: InnerNode, treeModel: TreeModel) {
    treeModel.nodesAdded(null, [root], this);
    this.root = root;
    visit<IRow>(root, (inner: InnerNode) => {
      treeModel.nodesAdded(inner.parent, [inner], this);
      return true;
    }, (leaf: LeafNode<IRow>)=> treeModel.nodesAdded(leaf.parent, [leaf], this));
  }

  public get Root() {
    return this.root;
  }

}
