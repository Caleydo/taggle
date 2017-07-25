/**
 * Created by Martin on 19.07.2017.
 */
import * as d3 from 'd3';
import {InnerNode, INode, LeafNode} from '../tree';
import {ITreeObserver, TreeEvent, EventType} from '../model/TreeModel';

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
    switch(e.eventType) {
      case EventType.NodeAdded: this.addNodes(e); break;
      case EventType.NodeAggregated: this.collapseNodes(e); break;
    }
  }

  private collapseNodes(e: TreeEvent) {
    const $ul = this.nodeMap.get(e.node);
    console.assert($ul);
    if(!$ul) { // should never happen
      return;
    }
    if(e.eventType === EventType.NodeAggregated) {
      $ul.classed('hidden', true);
    } else {
      $ul.classed('hidden', false);
    }
  }

  private addNodes(e: TreeEvent) {
    let node = e.node;
    if(!node.parent) { // if its the root node
      this.$node.classed(node.type, true);
      const $li = this.$node.append('ul').classed('hidden', false).append('li').datum(node);
      this.installNode($li, node);
    } else {
      const $ulParent = this.nodeMap.get(node.parent);
      console.assert($ulParent);
      if(!$ulParent) { // should never happen
        return;
      }
      //todo use old algorithm
      const size = $ulParent.node().childNodes.length;
      if(size > this.maxLeafVisCount) {
        return;
      }
      else if (size == this.maxLeafVisCount) {
        node = new LeafNode(`${node.parent.children.length - size} items more...`);
      }
      const $li = $ulParent.classed('hidden', true).append('li').datum(node);
      this.installNode($li, node);
    }
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


