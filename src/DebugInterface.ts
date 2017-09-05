/**
 * Created by Samuel Gratzl on 10.08.2017.
 */
import TreeVis from './treevis/TreeVis';
import FlyoutBar from './controls/FlyoutBar';
import InnerNode from './tree/InnerNode';
import {IRuleSet, createChooser} from './rule/index';

export default class DebugInterface {
  private readonly treeVis: TreeVis;
  private readonly fl: FlyoutBar;

  constructor(parent: HTMLElement, rebuilder: () => void, ruleChanged: (rule: IRuleSet)=>void) {
    this.fl = new FlyoutBar(parent.parentElement!, rebuilder);
    {
      const node = createChooser(ruleChanged);
      this.fl.node.insertBefore(node, this.fl.node.lastChild);
    }
    this.treeVis = new TreeVis(this.fl.body, rebuilder);
  }

  update(root: InnerNode) {
    if (this.fl.isVisible()) {
      this.treeVis.render(root);
    }
  }
}
