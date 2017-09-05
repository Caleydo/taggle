import {toArray, flatLeaves} from '../tree/utils';
import InnerNode from '../tree/InnerNode';
import LeafNode from '../tree/LeafNode';
import {EAggregationType} from '../tree';
import {IRuleSet} from './';

const defaultLeafHeight = 20;
const minLeafHeight = 1;
const maxLeafHeight = 20;
const defaultAggrHeight = 40;

function printTooSmall(height: number, minHeight: number, item: string) {
  console.error(`Height of item ${item} (${height} pixels) is smaller than minimum height (${minHeight} pixels) => set it to minimum height`);
}

function printTooBig(height: number, maxHeight: number, item: string) {
  console.error(`Height of item ${item} (${height} pixels) is bigger than minimum height (${maxHeight} pixels) => set it to minimum height`);
}

function checkHeightBoundaries(height: number, minHeight: number, maxHeight: number, item: string) {
  if(height < minHeight) {
    printTooSmall(height, minHeight, item);
    height = minHeight;
  }
  if(height > maxHeight) {
    printTooBig(height, maxHeight, item);
    height = maxHeight;
  }
  return height;
}

export class NotSpacefillingNotProportional implements IRuleSet {
  readonly name = 'not_spacefilling_not_proportional';
  readonly stratificationLevels = +Infinity;
  readonly sortLevels = +Infinity;

  readonly leaf = {
    height: defaultLeafHeight,
    visType: <'default'>'default'
  };

  readonly inner = {
    aggregatedHeight: defaultAggrHeight,
    visType: <'default'>'default'
  };
}

export class NotSpacefillingProportional implements IRuleSet  {
  readonly name = 'not_spacefilling_proportional';
  readonly stratificationLevels = +Infinity;
  readonly sortLevels = +Infinity;

  readonly leaf = {
    height: (n: LeafNode<any>) => {
      if(n.selected) {
        return defaultLeafHeight;
      }
      return minLeafHeight;
    },
    visType: <'default'>'default'
  };

  readonly inner = {
    aggregatedHeight: (node: InnerNode) => {
      if(node.aggregation !== EAggregationType.AGGREGATED) {
        return node.aggregatedHeight;
      }
      return flatLeaves(node).length * minLeafHeight;
    },
    visType: <'default'>'default'
  };
}

export class SpacefillingNotProportional implements IRuleSet {
  readonly name = 'spacefilling_not_proportional';
  readonly stratificationLevels = +Infinity;
  readonly sortLevels = +Infinity;

  private visibleHeight: number;
  private aggrItemCount: number;
  private unaggrItemCount: number;
  private selectedItemCount: number;

  update(root: InnerNode, availableHeight: number) {
    this.visibleHeight = availableHeight;
    const items = toArray(root);
    this.aggrItemCount = items.filter((n) => n.type === 'inner' && (<InnerNode>n).aggregation === EAggregationType.AGGREGATED).length;
    this.unaggrItemCount = items.filter((n) => n.type === 'leaf' && !n.parents.find((n2) => n2.aggregation === EAggregationType.AGGREGATED) && !(<LeafNode<any>>n).filtered).length;

    // find number of selected items
    this.selectedItemCount = items.filter((n) => n.type === 'leaf' && n.selected && !n.parents.find((x) => x.aggregation === EAggregationType.AGGREGATED)).length;
  }

  readonly leaf = {
    height: (n: LeafNode<any>) => {
      let height = this.unaggrItemCount - this.selectedItemCount > 0 ? (this.visibleHeight - this.aggrItemCount * this.inner.aggregatedHeight - this.selectedItemCount * defaultLeafHeight) / (this.unaggrItemCount - this.selectedItemCount) : 1;
      if(n.selected) {
        height = defaultLeafHeight;
      }
      return checkHeightBoundaries(height, minLeafHeight, maxLeafHeight, n.toString());
    },
    visType: <'default'>'default'
  };

  readonly inner = {
    aggregatedHeight: defaultAggrHeight,
    visType: <'default'>'default'
  };
}

export class SpacefillingProportional implements IRuleSet {
  readonly name = 'spacefilling_proportional';
  readonly stratificationLevels = +Infinity;
  readonly sortLevels = +Infinity;

  private visibleHeight: number;
  private itemCount: number;
  private selectedItemCount: number;

  update(root: InnerNode, availableHeight: number) {
    this.visibleHeight = availableHeight;

    const items = toArray(root);
    this.itemCount = items.filter((n) => n.type === 'leaf' && !(<LeafNode<any>>n).filtered).length;

    // find number of selected items
    this.selectedItemCount = items.filter((n) => n.type === 'leaf' && n.selected && !n.parents.find((x) => x.aggregation === EAggregationType.AGGREGATED)).length;
  }

  readonly leaf = {
    height: (n: LeafNode<any>) => {
      let height: number = this.itemCount - this.selectedItemCount > 0 ? (this.visibleHeight - this.selectedItemCount * defaultLeafHeight) / (this.itemCount - this.selectedItemCount) : 1;
      if(n.selected) {
        height = defaultLeafHeight;
      }
      height = checkHeightBoundaries(height, minLeafHeight, maxLeafHeight, n.toString());
      return height;
    },
    visType: <'default'>'default'
  };

  readonly inner = {
    aggregatedHeight: (node: InnerNode) => {
      if(node.aggregation !== EAggregationType.AGGREGATED) {
        return node.aggregatedHeight;
      }
      const itemsInGroup = flatLeaves(node);
      return this.itemCount - this.selectedItemCount > 0 ? (this.visibleHeight - this.selectedItemCount * defaultLeafHeight) / (this.itemCount - this.selectedItemCount) * itemsInGroup.length : 1;
    },
    visType: <'default'>'default'
  };
}
