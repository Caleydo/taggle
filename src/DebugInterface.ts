/**
 * Created by Samuel Gratzl on 10.08.2017.
 */
import TreeVis from './treevis/TreeVis';
import FlyoutBar from './controls/FlyoutBar';
import InnerNode from './tree/InnerNode';
import createChooser from './rule/RuleSwitcher';
import {ICallbacks} from './interfaces';

export default class DebugInterface {
  private readonly treeVis: TreeVis;
  private readonly fl: FlyoutBar;

  constructor(parent: HTMLElement, callbacks: ICallbacks) {
    this.fl = new FlyoutBar(parent.parentElement!, () => callbacks.update());
    {
      const node = createChooser((rule) => callbacks.ruleChanged(rule));
      this.fl.node.insertBefore(node, this.fl.node.lastChild);
    }
    this.treeVis = new TreeVis(this.fl.body, () => callbacks.update());
  }

  update(root: InnerNode) {
    if (this.fl.isVisible()) {
      this.treeVis.render(root);
    }
  }
}
