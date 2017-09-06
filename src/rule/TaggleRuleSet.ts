import {flatLeaves, toArray} from '../tree/utils';
import InnerNode from '../tree/InnerNode';
import LeafNode from '../tree/LeafNode';
import {EAggregationType} from '../tree';
import {IRuleSet, IRuleSetFactory, IRuleSetInstance} from './';

const defaultLeafHeight = 20;
const minLeafHeight = 1;
const maxLeafHeight = 20;
const defaultAggrHeight = 40;

function printTooSmall(height: number, minHeight: number, item: string) {
  console.log(`Height of item ${item} (${height} pixels) is smaller than minimum height (${minHeight} pixels) => set it to minimum height`);
}

function printTooBig(height: number, maxHeight: number, item: string) {
  console.log(`Height of item ${item} (${height} pixels) is bigger than maximal height (${maxHeight} pixels) => set it to maximal height`);
}

function checkHeightBoundaries(height: number, minHeight: number, maxHeight: number, item: string) {
  let error: string|null = null;
  if(height < minHeight) {
    printTooSmall(height, minHeight, item);
    error = `Height of some items were smaller than their minimal allowed size, limiting to minimal size`;
    height = minHeight;
  }
  if(height > maxHeight) {
    printTooBig(height, maxHeight, item);
    error = `Height of some items were bigger than their maximal allowed size, limiting to maximal size`;
    height = maxHeight;
  }
  return {height, error};
}

export const notSpacefillingNotProportional: IRuleSet = {
  name: 'NotSpacefillingNotProportional',
  stratificationLevels: +Infinity,
  sortLevels: +Infinity,

  leaf: {
    height: defaultLeafHeight,
    visType: 'default'
  },

  inner: {
    aggregatedHeight: defaultAggrHeight,
    visType: 'default'
  }
};

export const notSpacefillingProportional: IRuleSet = {
   name: 'NotSpacefillingProportional',
   stratificationLevels:  +Infinity,
   sortLevels :  +Infinity,

   leaf:  {
    height: (n: LeafNode<any>) => {
      if(n.selected) {
        return defaultLeafHeight;
      }
      return minLeafHeight;
    },
    visType: 'default'
  },

  inner: {
    aggregatedHeight: (node: InnerNode) => {
      if(node.aggregation !== EAggregationType.AGGREGATED) {
        return node.aggregatedHeight;
      }
      return flatLeaves(node).length * minLeafHeight;
    },
    visType: 'default'
  }
};

class SpacefillingNotProportional implements IRuleSetInstance {
  private readonly visibleHeight: number;
  private readonly aggrItemCount: number;
  private readonly unaggrItemCount: number;
  private readonly selectedItemCount: number;

  private readonly spaceFillingErrors= new Set<string>();

  constructor(root: InnerNode, availableHeight: number) {
    this.visibleHeight = availableHeight;
    const items = toArray(root);
    this.aggrItemCount = items.filter((n) => n.type === 'inner' && (<InnerNode>n).aggregation === EAggregationType.AGGREGATED).length;
    this.unaggrItemCount = items.filter((n) => n.type === 'leaf' && !n.parents.find((n2) => n2.aggregation === EAggregationType.AGGREGATED) && !(<LeafNode<any>>n).filtered).length;

    // find number of selected items
    this.selectedItemCount = items.filter((n) => n.type === 'leaf' && n.selected && !n.parents.find((x) => x.aggregation === EAggregationType.AGGREGATED)).length;
  }

  readonly leaf = {
    height: (n: LeafNode<any>) => {
      let baseHeight = this.unaggrItemCount - this.selectedItemCount > 0 ? (this.visibleHeight - this.aggrItemCount * this.inner.aggregatedHeight - this.selectedItemCount * defaultLeafHeight) / (this.unaggrItemCount - this.selectedItemCount) : 1;
      if(n.selected) {
        baseHeight = defaultLeafHeight;
      }
      const {height, error} = checkHeightBoundaries(baseHeight, minLeafHeight, maxLeafHeight, n.toString());
      if (error) {
        this.spaceFillingErrors.add(error);
      }
      return height;
    },
    visType: <'default'>'default'
  };

  readonly inner = {
    aggregatedHeight: defaultAggrHeight,
    visType: <'default'>'default'
  };

  get violations() {
    return {
      spaceFilling: this.spaceFillingErrors.size > 0 ? Array.from(this.spaceFillingErrors).join('\n') : undefined,
    };
  }
}

export const spacefillingNotProportional: IRuleSetFactory = {
  name: 'SpacefillingNotProportional',
  stratificationLevels: +Infinity,
  sortLevels: +Infinity,
  apply: (tree: InnerNode, availableHeight) => new SpacefillingNotProportional(tree, availableHeight)
};

export class SpacefillingProportional implements IRuleSetInstance {
  private readonly visibleHeight: number;
  private readonly itemCount: number;
  private readonly selectedItemCount: number;

  private readonly spaceFillingErrors= new Set<string>();

  constructor(root: InnerNode, availableHeight: number) {
    this.visibleHeight = availableHeight;

    const items = toArray(root);
    this.itemCount = items.filter((n) => n.type === 'leaf' && !(<LeafNode<any>>n).filtered).length;

    // find number of selected items
    this.selectedItemCount = items.filter((n) => n.type === 'leaf' && n.selected && !n.parents.find((x) => x.aggregation === EAggregationType.AGGREGATED)).length;
  }

  readonly leaf = {
    height: (n: LeafNode<any>) => {
      let baseHeight = this.itemCount - this.selectedItemCount > 0 ? (this.visibleHeight - this.selectedItemCount * defaultLeafHeight) / (this.itemCount - this.selectedItemCount) : 1;
      if(n.selected) {
        baseHeight = defaultLeafHeight;
      }
      const {height, error} = checkHeightBoundaries(baseHeight, minLeafHeight, maxLeafHeight, n.toString());
      if (error) {
        this.spaceFillingErrors.add(error);
      }
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

  get violations() {
    return {
      spaceFilling: this.spaceFillingErrors.size > 0 ? Array.from(this.spaceFillingErrors).join('\n') : undefined,
    };
  }
}

export const spacefillingProportional: IRuleSetFactory = {
  name: 'SpacefillingProportional',
  stratificationLevels: +Infinity,
  sortLevels: +Infinity,
  apply: (tree: InnerNode, availableHeight) => new SpacefillingProportional(tree, availableHeight)
};
