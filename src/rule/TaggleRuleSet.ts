import {toArray, flatLeaves} from '../tree/utils';
import InnerNode from '../tree/InnerNode';
import LeafNode from '../tree/LeafNode';
import {EAggregationType} from '../tree';
import {IRuleSet} from './';

export interface IUpdate {
  update(root: InnerNode, params: any[]): void;
}

const defaultLeafHeight: number = 20;
const minLeafHeight: number = 1;
const maxLeafHeight: number = 20;

const defaultAggrHeight: number = 40;

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
  name = 'not_spacefilling_not_proportional';
  stratificationLevels = +Infinity;
  sortLevels = +Infinity;

  leaf: {
    height: number|((node: LeafNode<any>)=>number);
    visType: 'default'|'compact'|((node: LeafNode<any>) => 'default'|'compact');
  } = {
    height: defaultLeafHeight,
    visType: 'default'
  };

  inner: {
    aggregatedHeight: number;
    visType: 'default'|'mean'|((node: InnerNode) => 'default'|'mean');
  } = {
    aggregatedHeight: defaultAggrHeight,
    visType: 'default'
  };
}

export class NotSpacefillingProportional implements IRuleSet  {
  name = 'not_spacefilling_proportional';
  stratificationLevels = +Infinity;
  sortLevels = +Infinity;

  leaf: {
    height: number|((node: LeafNode<any>)=>number);
    visType: 'default'|'compact'|((node: LeafNode<any>) => 'default'|'compact');
  } = {
    height: (n: LeafNode<any>) => {
      if(n.selected) {
        return defaultLeafHeight;
      }
      return minLeafHeight;
    },
    visType: 'default'
  };

  inner: {
    aggregatedHeight: number|((node: InnerNode)=>number);
    visType: 'default'|'mean'|((node: InnerNode) => 'default'|'mean');
  } = {
    aggregatedHeight: (node: InnerNode) => {
      if(node.aggregation !== EAggregationType.AGGREGATED) {
        return node.aggregatedHeight;
      }
      let height = flatLeaves(node).length * minLeafHeight;
      return height;
    },
    visType: 'default'
  };
}

export class SpacefillingNotProportional implements IRuleSet, IUpdate {
  name = 'spacefilling_not_proportional';
  stratificationLevels = +Infinity;
  sortLevels = +Infinity;

  visibleHeight: number;
  aggrItemCount: number;
  unaggrItemCount: number;
  selectedItemCount: number;

  constructor(root: InnerNode) {
    this.update(root, [400]); // arbitrary constant just for initialization
  }

  update(root: InnerNode, params: any[]) {
    this.visibleHeight = params[0];
    const items = toArray(root);
    this.aggrItemCount = items.filter((n) => n.type === 'inner' && (<InnerNode>n).aggregation === EAggregationType.AGGREGATED).length;
    this.unaggrItemCount = items.filter((n) => n.type === 'leaf' && !n.parents.find((n2) => n2.aggregation === EAggregationType.AGGREGATED) && !(<LeafNode<any>>n).filtered).length;

    // find number of selected items
    this.selectedItemCount = items.filter((n) => n.type === 'leaf' && n.selected && !n.parents.find((x) => x.aggregation === EAggregationType.AGGREGATED)).length;
  }

  leaf : {
    height: number|((node: LeafNode<any>)=>number);
    visType: 'default'|'compact'|((node: LeafNode<any>) => 'default'|'compact');
  } = {
    height: (n: LeafNode<any>) => {
      let height: number = this.unaggrItemCount - this.selectedItemCount > 0 ? (this.visibleHeight - this.aggrItemCount * this.inner.aggregatedHeight - this.selectedItemCount * defaultLeafHeight) / (this.unaggrItemCount - this.selectedItemCount) : 1;
      if(n.selected) {
        height = defaultLeafHeight;
      }
      height = checkHeightBoundaries(height, minLeafHeight, maxLeafHeight, n.toString());
      return height;
    },
    visType: 'default'
  };

  inner : {
    aggregatedHeight: number;
    visType: 'default'|'mean'|((node: InnerNode) => 'default'|'mean');
  } = {
    aggregatedHeight: defaultAggrHeight,
    visType: 'default'
  };
}

export class SpacefillingProportional implements IRuleSet, IUpdate {
  name = 'spacefilling_proportional';
  stratificationLevels = +Infinity;
  sortLevels = +Infinity;

  visibleHeight: number;
  itemCount: number;
  selectedItemCount: number;

  constructor(root: InnerNode) {
    this.update(root, [400]); // arbitrary constant just for initializationvisi
  }

  update(root: InnerNode, params: any[]) {
    this.visibleHeight = params[0];

    const items = toArray(root);
    this.itemCount = items.filter((n) => n.type === 'leaf' && !(<LeafNode<any>>n).filtered).length;

    // find number of selected items
    this.selectedItemCount = items.filter((n) => n.type === 'leaf' && n.selected && !n.parents.find((x) => x.aggregation === EAggregationType.AGGREGATED)).length;
  }

  leaf : {
    height: number|((node: LeafNode<any>)=>number);
    visType: 'default'|'compact'|((node: LeafNode<any>) => 'default'|'compact');
  } = {
    height: (n: LeafNode<any>) => {
      let height: number = this.itemCount - this.selectedItemCount > 0 ? (this.visibleHeight - this.selectedItemCount * defaultLeafHeight) / (this.itemCount - this.selectedItemCount) : 1;
      if(n.selected) {
        height = defaultLeafHeight;
      }
      height = checkHeightBoundaries(height, minLeafHeight, maxLeafHeight, n.toString());
      return height;
    },
    visType: 'default'
  };

  inner : {
    aggregatedHeight: number|((node: InnerNode)=>number);
    visType: 'default'|'mean'|((node: InnerNode) => 'default'|'mean');
  } = {
    aggregatedHeight: (node) => {
      if(node.aggregation !== EAggregationType.AGGREGATED) {
        return node.aggregatedHeight;
      }
      const itemsInGroup = flatLeaves(node);
      let height: number = this.itemCount - this.selectedItemCount > 0 ? (this.visibleHeight - this.selectedItemCount * defaultLeafHeight) / (this.itemCount - this.selectedItemCount) * itemsInGroup.length : 1;
      return height;
    },
    visType: 'default'
  };
}
