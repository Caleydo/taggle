import {toArray, flatLeaves} from '../tree/utils';
import InnerNode from '../tree/InnerNode';
import LeafNode from '../tree/LeafNode';
import {EAggregationType} from '../tree';
import {ruleSets, IRuleSet} from './';

interface IUpdate {
  update(root: InnerNode, params: any[]): void;
}

const minLeafHeight: number = 1;
const maxLeafHeight: number = 20;

const minAggrHeight: number = 20;
const maxAggrHeight: number = 500;

class TaggleRuleSet1 implements IRuleSet {
  stratificationLevels = +Infinity;
  sortLevels = +Infinity;
  leaf: {
    height: number|((node: LeafNode<any>)=>number);
    visType: 'default'|'compact'|((node: LeafNode<any>) => 'default'|'compact');
  } = {
    height: 20,
    visType: 'default'
  };

  inner: {
    aggregatedHeight: number;
    visType: 'default'|'mean'|((node: InnerNode) => 'default'|'mean');
  } = {
    aggregatedHeight: 40,
    visType: 'default'
  };
}

class TaggleRuleSet2 implements IRuleSet  {
  stratificationLevels = +Infinity;
  sortLevels = +Infinity;
  leaf: {
    height: number|((node: LeafNode<any>)=>number);
    visType: 'default'|'compact'|((node: LeafNode<any>) => 'default'|'compact');
  } = {
    height: 1,
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
      let height = flatLeaves(node).length;
      if(height < minAggrHeight) {
        console.error(`Aggr item height (${height} pixels) is smaller than minimum height (${minAggrHeight} pixels) => set it to minimum height`);
        height = minAggrHeight;
      }
      if(height > maxAggrHeight) {
        console.error(`Aggr item height (${height} pixels) is greater than maximum height (${maxAggrHeight} pixels) => set it to maximum height`);
        height = maxAggrHeight;
      }
      return height
    },
    visType: 'default'
  };
};

class TaggleRuleSet3 implements IRuleSet, IUpdate {
  visibleHeight: number;
  aggrItemCount: number;
  unaggrItemCount: number;

  constructor(root: InnerNode) {
    this.update(root, [400]); // arbitrary constant just for initialization
  }
  stratificationLevels = +Infinity;
  sortLevels = +Infinity;

  update(root: InnerNode, params: any[]) {
    this.visibleHeight = params[0];
    this.aggrItemCount = toArray(root).filter((n) => n.type === 'inner' && (<InnerNode>n).aggregation === EAggregationType.AGGREGATED).length;
    this.unaggrItemCount = toArray(root).filter((n) => n.type === 'leaf' && !n.parents.find((n2) => n2.aggregation === EAggregationType.AGGREGATED)).length;
  }

  leaf : {
    height: number|((node: LeafNode<any>)=>number);
    visType: 'default'|'compact'|((node: LeafNode<any>) => 'default'|'compact');
  } = {
    height: () => {
      let height: number = this.unaggrItemCount > 0 ? (this.visibleHeight - this.aggrItemCount * this.inner.aggregatedHeight) / this.unaggrItemCount : 1;
      if(height < minLeafHeight) {
        console.error(`Item height (${height} pixels) is smaller than minimum height (${minLeafHeight} pixels) => set it to minimum height`);
        height = minLeafHeight;
      }
      if(height > maxLeafHeight) {
        console.error(`Item height (${height} pixels) is greater than maximum height (${maxLeafHeight} pixels) => set it to maximum height`);
        height = maxLeafHeight;
      }
      return height;
    },
    visType: 'default'
  };

  inner : {
    aggregatedHeight: number;
    visType: 'default'|'mean'|((node: InnerNode) => 'default'|'mean');
  } = {
    aggregatedHeight: 40,
    visType: 'default'
  };
}

class TaggleRuleSet4 implements IRuleSet, IUpdate {
  visibleHeight: number;
  itemCount: number;

  constructor(root: InnerNode) {
    this.update(root, [400]); // arbitrary constant just for initializationvisi
  }
  stratificationLevels = +Infinity;
  sortLevels = +Infinity;

  update(root: InnerNode, params: any[]) {
    this.visibleHeight = params[0];
    this.itemCount = toArray(root).filter((n) => n.type === 'leaf').length;
  }

  leaf : {
    height: number|((node: LeafNode<any>)=>number);
    visType: 'default'|'compact'|((node: LeafNode<any>) => 'default'|'compact');
  } = {
    height: () => {
      let height: number = this.itemCount > 0 ? this.visibleHeight / this.itemCount : 1;
      if(height < minLeafHeight) {
        console.error(`Item height (${height} pixels) is smaller than minimum height (${minLeafHeight} pixels) => set it to minimum height`);
        height = minLeafHeight;
      }
      if(height > maxLeafHeight) {
        console.error(`Item height (${height} pixels) is greater than maximum height (${maxLeafHeight} pixels) => set it to maximum height`);
        height = maxLeafHeight;
      }
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
      const itemsInGroup = flatLeaves(node).length;
      let height: number = this.itemCount > 0 ? this.visibleHeight / this.itemCount * itemsInGroup : 1;
      if(height < minAggrHeight) {
        console.error(`Aggr item height (${height} pixels) is smaller than minimum height (${minAggrHeight} pixels) => set it to minimum height`);
        height = minAggrHeight;
      }
      if(height > maxAggrHeight) {
        console.error(`Aggr item height (${height} pixels) is greater than maximum height (${maxAggrHeight} pixels) => set it to maximum height`);
        height = maxAggrHeight;
      }
      return height;
    },
    visType: 'default'
  };
}

export function createTaggleRuleSets(root: InnerNode) {
  ruleSets.push({name: 'not_spacefilling not_proportional', ruleSet: new TaggleRuleSet1()});
  ruleSets.push({name: 'not_spacefilling proportional', ruleSet: new TaggleRuleSet2()});
  ruleSets.push({name: 'spacefilling not_proportional', ruleSet: new TaggleRuleSet3(root)});
  ruleSets.push({name: 'spacefilling proportional', ruleSet: new TaggleRuleSet4(root)});
}

export function updateRuleSets(root: InnerNode, params: any[]) {
  ruleSets.forEach((r) => {
    if(isUpdate(r.ruleSet)) {
      r.ruleSet.update(root, params);
    }
  });
}

function isUpdate(arg: any): arg is IUpdate {
    return arg.update !== undefined;
}
