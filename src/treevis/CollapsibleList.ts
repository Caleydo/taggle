/**
 * Created by Martin on 19.07.2017.
 */
import * as d3 from 'd3';
import {InnerNode, INode, LeafNode} from '../tree';

export default class CollapsibleList {
  private readonly $node: d3.Selection<any>;

  constructor(root: HTMLElement, private maxLeafVisCount = 20) {
    this.$node = d3.select(root).append('div').classed('treevis', true);
  }

  render(root: InnerNode) {
    const checkCount = (node: INode) => {
      // if the next level is a leaf level
      if(node.type === 'inner') {
        const leaves = node.children.filter((x) => x.type === 'leaf');
        const inners = node.children.filter((x) => x.type === 'inner');

        if(leaves.length > this.maxLeafVisCount) {
          inners.unshift(new LeafNode(leaves.length + ' items'));
          return inners;
        }

        return node.children;
      } else {
        return [];
      }
    };

    const renderLevel = ($node: d3.Selection<INode>, node: INode) => {
      node.type === 'inner' ? $node.classed('inner', true) : $node.classed('leaf', true);

      const $li = $node.append('ul').classed('hidden', true).selectAll('li').data(checkCount(node));
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
    root.parent = new InnerNode('dummy node');
    root.parent.children.push(root);
    root = root.parent;
    renderLevel(this.$node, root);
    // remove dummy root again after rendering
    root = <InnerNode> root.children[0];
    root.parent = null;
    this.$node.select('ul').classed('hidden', false);
  }

  buildLeafNodeLabel(node: LeafNode<any>) {
    return node.item +
        ' (Current Height: ' + node.height +
        ' | Renderer: ' + node.renderer +
        ')';
  }

  buildInnerNodeLabel(node: InnerNode) {
    return node.name +
        ' (Child Count: ' + node.length +
        ' | Current Height: ' + node.height +
        ' | Aggr. Height: ' + node.aggregatedHeight +
        ' | Aggregation State: ' + node.aggregation +
        ' | Renderer: ' + node.renderer +
        ')';
  }
}


