import {toArray} from '../tree/utils';
import InnerNode from '../tree/InnerNode';
import LeafNode from '../tree/LeafNode';
import {EAggregationType} from '../tree';
import {ruleSets, IRuleSet} from './';

interface IUpdate {
  update(root: InnerNode, params: any[]): void;
}

class TaggleRuleSet31 implements IRuleSet, IUpdate {
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
    height: (node) => {
      let x: number = this.unaggrItemCount > 0 ? (this.visibleHeight - this.aggrItemCount * this.inner.aggregatedHeight) / this.unaggrItemCount : 1;
      if(x < node.minHeight) {
        console.error(`Item height is smaller than minimum height (${node.minHeight} pixels) => set it to minimum height`);
        x = node.minHeight;
      }
      if(x > node.maxHeight) {
        console.error(`Item height is greater than maximum height (${node.maxHeight} pixels) => set it to maximum height`);
        x = node.maxHeight
      }
      return x;
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

export function createTaggleRuleSets(root: InnerNode) {
  const tg31 = new TaggleRuleSet31(root);
  ruleSets.push({ name: 'spacefilling not_proportional', ruleSet: tg31});
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
