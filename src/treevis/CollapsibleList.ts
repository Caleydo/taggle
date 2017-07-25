/**
 * Created by Martin on 19.07.2017.
 */
import * as d3 from 'd3';
import {InnerNode, INode, LeafNode} from '../tree';
import {ITreeObserver, TreeEvent} from '../model/TreeModel';

export default class CollapsibleList implements ITreeObserver {
  private readonly $node: d3.Selection<any>;
  private nodeMap = new Map<INode, d3.Selection<any>>();

  constructor(root: HTMLElement, private maxLeafVisCount = 20) {
    this.$node = d3.select(root).append('div').classed('treevis', true);
  }

  buildLeafNodeLabel(node: LeafNode<any>) {
    return node.item +
        ' (Current Height: ' + node.height +
        ' | Renderer: ' + node.renderer +
        ')';
  }

  buildInnerNodeLabel(node: InnerNode) {
    return node.name +
        ' (Child Count: ' + node.children.length +
        ' | Current Height: ' + node.height +
        ' | Aggr. Height: ' + node.aggregatedHeight +
        ' | Aggregation State: ' + node.aggregation +
        ' | Renderer: ' + node.renderer +
        ')';
  }

  update(e: TreeEvent): void {
    e.leaves.forEach((leaf) => {
      if(!leaf.parent) { // if its the root node
        this.$node.classed(leaf.type, true);
        const $li = this.$node.append('ul').classed('hidden', false).append('li').datum(leaf);
        this.installNode($li, leaf);
      } else {
        const $ulParent = this.nodeMap.get(leaf.parent);
        console.assert($ulParent);
        if(!$ulParent) { // should never happen
          return;
        }
        const size = $ulParent.node().childNodes.length;
        if(size > this.maxLeafVisCount) {
          return;
        }
        else if (size == this.maxLeafVisCount) {
          leaf = new LeafNode(`${leaf.parent.children.length - size} items more...`);
        }
        const $li = $ulParent.classed('hidden', true).append('li').datum(leaf);
        this.installNode($li, leaf);
      }
    });
  }

  private installNode($li: d3.Selection<any>, leaf: INode) {
     $li.on('click', function(this: HTMLElement) {
          const $this = d3.select(this);
          const hiddenVal = $this.select('ul').classed('hidden');
          $this.select('ul').classed('hidden', !hiddenVal);
          (<MouseEvent>d3.event).stopPropagation();
        });
      $li.text((d) => d.type === 'inner' ? this.buildInnerNodeLabel(d) : this.buildLeafNodeLabel(d));
      const $ulNew = $li.append('ul');
      $li.classed(leaf.type, true);
      this.nodeMap.set(leaf, $ulNew);
  }
}


