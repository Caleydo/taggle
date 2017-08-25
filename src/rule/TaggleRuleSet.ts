import {toArray} from '../tree/utils';
import InnerNode from '../tree/InnerNode';
import LeafNode from '../tree/LeafNode';
import {EAggregationType} from '../tree';
import {ruleSets, IRuleSet} from './';

interface IUpdate {
  update(root: InnerNode): void;
}

class TaggleRuleSet31 implements IRuleSet, IUpdate {
  readonly visibleHeight: number;
  aggrItemCount: number;
  unaggrItemCount: number;

  constructor(root: InnerNode, visibleHeight: number) {
    this.visibleHeight = visibleHeight;
    this.update(root);
  }
  stratificationLevels = +Infinity;
  sortLevels = +Infinity;

  update(root: InnerNode) {
    this.aggrItemCount = toArray(root).filter((n) => n.type === 'inner' && (<InnerNode>n).aggregation === EAggregationType.AGGREGATED).length;
    this.unaggrItemCount = toArray(root).filter((n) => n.type === 'leaf').length;
  }

  leaf : {
    height: number|((node: LeafNode<any>)=>number);
    visType: 'default'|'compact'|((node: LeafNode<any>) => 'default'|'compact');
  } = {
    height: () => {
      let x: number = (this.visibleHeight - this.aggrItemCount * this.inner.aggregatedHeight) / this.unaggrItemCount;
      if(x < 1) {
        console.error('Space filling not possible. Item has subpixel size.')
        x = 1;
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

export function createTaggleRuleSets(root: InnerNode, parent: HTMLElement)
{
  console.log(parent);
  const tg31 = new TaggleRuleSet31(root, inViewport(null));
  ruleSets.push({ name: 'spacefilling not_proportional', ruleSet: tg31});
}

function inViewport($el: any) {
  console.log($el);
   return 100;
}

export function updateRuleSets(root: InnerNode) {
  ruleSets.forEach((r) => {
    if(isUpdate(r.ruleSet)) {
      r.ruleSet.update(root);
    }
  });
}

function isUpdate(arg: any): arg is IUpdate {
    return arg.update !== undefined;
}
