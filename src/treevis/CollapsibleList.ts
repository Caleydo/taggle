/**
 * Created by Martin on 19.07.2017.
 */
import * as d3 from 'd3';
import {InnerNode, INode, LeafNode} from '../tree';
import {ITreeObserver, TreeEvent} from '../model/TreeModel';

export default class CollapsibleList implements ITreeObserver {
  private readonly $node: d3.Selection<any>;
  private nodeMap = new Map();

  constructor(root: HTMLElement, private maxLeafVisCount = 20) {
    this.$node = d3.select(root).append('div').classed('treevis', true);
  }

  chooseItemData(node: INode) {
    if(node.type === 'inner') {
      // separate leafs and inner nodes
      // if leaf count is > max leaf count then we just want to show a single node
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
  }

  render(root: InnerNode) {
    const chooseItemData = (node: INode) => {
      if(node.type === 'inner') {
        // separate leafs and inner nodes
        // if leaf count is > max leaf count then we just want to show a single node
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

  update(e: TreeEvent): void {
    e.leaves.forEach((leave) => {
      // if its the root node
      if(!leave.parent) {
        this.$node.classed(leave.type, true);
        this.$node.append('ul').classed('hidden', false);
        this.nodeMap.set(leave, this.$node);
      } else {
        /*const $parent = this.nodeMap.get(leave.parent.index);
        $parent.select('ul').selectAll('li').data(this.chooseItemData(leave));
        this.nodeMap.set(leave, leave.index);*/
        console.log('leave');
      }
    });
  }
}


