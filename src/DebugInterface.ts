/**
 * Created by Samuel Gratzl on 10.08.2017.
 */
import CollapsibleList from './treevis/CollapsibleList';
import FlyoutBar from './controls/FlyoutBar';
import InnerNode from './tree/InnerNode';

export default class DebugInterface {
  private readonly treeVis: CollapsibleList;
  private readonly fl: FlyoutBar;

  constructor(parent: HTMLElement, rebuilder: () => void) {
    this.fl = new FlyoutBar(parent.parentElement!);
    this.treeVis = new CollapsibleList(this.fl.body, rebuilder);

    const fl = new FlyoutBar(this.root.parentElement!);
    {
      const node = createChooser((rule) => {
        this.ruleSet = rule;
        this.defaultRowHeight = typeof this.ruleSet.leaf.height === 'number' ? this.ruleSet.leaf.height : 20;
        applyStaticRuleSet(rule, this.tree);
        this.rebuild(null, false);
      });
      fl.node.insertBefore(node, fl.node.lastChild);
    }
    this.treeVis = new CollapsibleList(fl.body, rebuilder);
  }

  update(root: InnerNode) {
    if (this.fl.isVisible()) {
      this.treeVis.render(root);
    }
  }
}
