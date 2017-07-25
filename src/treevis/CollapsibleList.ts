/**
 * Created by Martin on 19.07.2017.
 */
import * as d3 from 'd3';
import {InnerNode, INode, LeafNode} from '../tree';

export default class CollapsibleList {
  private readonly $node: d3.Selection<any>;

  constructor(root: HTMLElement, private readonly maxLeafVisCount = 20) {
    this.$node = d3.select(root).append('div').classed('treevis', true);
  }

  render(root: InnerNode) {
    const chooseItemData = (node: INode) => {
      if(node.type === 'inner') {

        // separate leafs and inner nodes
        // if leaf count is > max leaf count then we just want to show a single node
        const numLeaves = node.children.reduce((a, n) => a + (n.type === 'leaf' ? 1 : 0), 0);
        const inners = node.children.filter((x) => x.type === 'inner');

        if(numLeaves > this.maxLeafVisCount) {
          inners.unshift(new LeafNode('${numLeaves} items'));
          return inners;
        }

        return node.children;
      }
      return [];
    };

    const renderLevel = ($node: d3.Selection<INode>, node: INode) => {
      $node.classed(node.type, true);
      const $li = $node.append('ul').classed('hidden', true).selectAll('li').data(chooseItemData(node));
      $li.enter().append('li')
        .on('click', function(this: HTMLElement) {
          const $this = d3.select(this);
          const hiddenVal = $this.select('ul').classed('hidden');
          $this.select('ul').classed('hidden', !hiddenVal);
          (<MouseEvent>d3.event).stopPropagation();
        });
      $li.text((d) => d.type === 'inner' ? this.buildInnerNodeLabel(d) : this.buildLeafNodeLabel(d));
      $li.each(function(this: HTMLElement, d: InnerNode) {
        renderLevel(d3.select(this), d);
      });
      $li.exit().remove();
    };

    // create new dummy root
    console.assert(root.parent === null);

    const newRoot = new InnerNode('dummy node');
    newRoot.children.push(root);
    renderLevel(this.$node, newRoot);
    this.$node.select('ul').classed('hidden', false);
  }

  private buildLeafNodeLabel(node: LeafNode<any>) {
    return `${node.item} (Current Height: ${node.height} | Renderer: ${node.renderer} )`;
  }

  private buildInnerNodeLabel(node: InnerNode) {
    return `${node.name} (Child Count: ${node.children.length} | Current Height: ${node.height} | Aggr. Height: ${node.aggregatedHeight} | Renderer: ${node.renderer} )`;
  }
}


