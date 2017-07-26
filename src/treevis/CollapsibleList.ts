/**
 * Created by Martin on 19.07.2017.
 */
import * as d3 from 'd3';
import {InnerNode, INode, LeafNode, EAggregationType} from '../tree';
import {ITreeObserver, TreeEvent, EventType} from '../model/TreeModel';

export default class CollapsibleList implements ITreeObserver {
  private readonly $node: d3.Selection<any>;
  private readonly nodeMap = new Map<INode, d3.Selection<any>>();

  constructor(root: HTMLElement, private readonly maxLeafVisCount = 20) {
    this.$node = d3.select(root).append('div').classed('treevis', true);
  }

  private buildLeafNodeLabel(node: LeafNode<any>) {
    return `${node.item} (Current Height: ${node.height} | Renderer: ${node.renderer} )`;
  }

  private buildInnerNodeLabel(node: InnerNode) {
    return `${node.name} (Child Count: ${node.length} | Current Height: ${node.height} | Aggr. Height: ${node.aggregatedHeight} | Renderer: ${node.renderer} )`;
  }

  updateListener(e: TreeEvent): void {
    switch(e.eventType) {
      case EventType.NodeAdded: this.addNodes(e); break;
      case EventType.NodeAggregated: this.collapseNodes(e, true); break;
      case EventType.NodeUnaggregated: this.collapseNodes(e, false); break;
    }
  }

  private collapseNodes(e: TreeEvent, collapse: boolean) {
    const $ul = this.nodeMap.get(e.node);
    console.assert($ul);
    if(!$ul) { // should never happen
      return;
    }
    $ul.classed('hidden', collapse);
  }

  private addNodes(e: TreeEvent) {
    let node = e.node;
    if(!node.parent) { // if its the root node
      this.$node.classed(node.type, true);
      const $ul = this.$node.append('ul');
      const $li = $ul.append('li').datum(node);
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

      if (size === this.maxLeafVisCount) {
        node = new LeafNode(`${node.parent.children.length - size} items more...`);
      }
      const $li = $ulParent.append('li').datum(node);
      this.installNode($li, node);
    }
  }

  private setHiddenState($ul: d3.Selection<any>, node: INode) {
    if(node.type !== 'inner') {
      return;
    }

    const inner = <InnerNode> node;
    //todo calculate that in model and pass it as parameter here
    inner.aggregation === EAggregationType.AGGREGATED ? $ul.classed('hidden', true) :$ul.classed('hidden', false);
  }

  private installNode($li: d3.Selection<any>, node: INode) {
     $li.on('click', function(this: HTMLElement) {
          const $this = d3.select(this);
          const hiddenVal = $this.select('ul').classed('hidden');
          $this.select('ul').classed('hidden', !hiddenVal);
          (<MouseEvent>d3.event).stopPropagation();
        });
      $li.text((d) => d.type === 'inner' ? this.buildInnerNodeLabel(d) : this.buildLeafNodeLabel(d));
      const $ulNew = $li.append('ul');
      this.setHiddenState($ulNew, node);
      $li.classed(node.type, true);
      this.nodeMap.set(node, $ulNew);
  }
}


