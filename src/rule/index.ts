/**
 * Created by Samuel Gratzl on 08.08.2017.
 */
import LeafNode from '../tree/LeafNode';
import InnerNode from '../tree/InnerNode';
import {visit} from '../tree/utils';
import {
  notSpacefillingNotProportional,
  notSpacefillingProportional,
  spacefillingNotProportional,
  spacefillingProportional
} from './TaggleRuleSet';

export {default as createChooser} from './RuleSwitcher';

export interface IRuleViolations {
  spaceFilling?: string;
  proportionalRatios?: string;
}

export interface IStaticRuleSet {
  name: string;
  /**
   * number of possible stratification levels = inner node levels
   * @default +Infinity
   */
  stratificationLevels: number;

  /**
   * number of possible nested sort criteria
   * @default +Infinity
   */
  sortLevels: number;

  levelOfDetail(node: InnerNode|LeafNode<any>): 'high'|'medium'|'low';
}

export interface IRuleSetInstance {
  leaf: {
    height: number|((node: LeafNode<any>)=>number);
    visType: 'default'|'compact'|((node: LeafNode<any>) => 'default'|'compact');
  };

  inner:  {
    aggregatedHeight: number|((node: InnerNode)=>number);
    visType: 'default'|'mean'|((node: InnerNode) => 'default'|'mean');
  };

  violations?: IRuleViolations;
}

export declare type IRuleSet = IStaticRuleSet&IRuleSetInstance;

export interface IRuleSetFactory extends IStaticRuleSet {
  apply(root: InnerNode, availableHeight: number): IRuleSetInstance;
}

export declare type IRuleSetLike = IRuleSet|IRuleSetFactory;

export function levelOfDetail(node: InnerNode|LeafNode<any>): 'high'|'medium'|'low' {
  if (node.type === 'inner') {
    if (node.height >= 35) {
      return 'high';
    }
    if (node.height >= 15) {
      return 'medium';
    }
    return 'low';
  }
  if (node.height >= 18) {
    return 'high';
  }
  if (node.height >= 10) {
    return 'medium';
  }
  return 'low';
}

const tableRuleSet: IRuleSet = {
  name: 'table',
  stratificationLevels: 0,
  sortLevels: 1,
  leaf: {
    height: 20,
    visType: 'default'
  },
  inner: {
    aggregatedHeight: 100,
    visType: 'default'
  },
  levelOfDetail: () => 'high'
};


const compactRuleSet: IRuleSet = Object.assign({}, tableRuleSet, {
  name: 'compact',
  stratificationLevels: 0,
  sortLevels: 1,
  leaf: {
    height: 2,
    visType: 'compact'
  },
  levelOfDetail: (node: InnerNode|LeafNode<any>) => node.type === 'inner' ? 'high' : 'low'
});

function tableLensHeight(distance: number) {
  if (!isFinite(distance)) {
    return 2;
  }
  return Math.max(2, 40 * Math.sin(Math.PI / 2 * ((7 - Math.min(distance, 7)) / 7)));
}

const tableLensRuleSet: IRuleSet = Object.assign({}, tableRuleSet, {
  name: 'tablelens',
  stratificationLevels: 0,
  sortLevels: 1,
  leaf: {
    height: (node: LeafNode<any>) => {
      const distance = node.nearestSibling((n) => n.selected);
      return tableLensHeight(distance);
    },
    visType: (node: LeafNode<any>) => {
      const height = tableLensHeight(node.nearestSibling((n) => n.selected));
      return height < 20 ? 'compact': 'default';
    }
  },
  levelOfDetail
});

function functor<P, T>(r: T | ((p: P) => T), p: P) {
  if (typeof r === 'function') {
    return r(p);
  }
  return r;
}

function toInstance(ruleSet: IRuleSetLike, tree: InnerNode, availableHeight: number) {
  if (typeof (<IRuleSetFactory>ruleSet).apply === 'function') {
    return (<IRuleSetFactory>ruleSet).apply(tree, availableHeight);
  }
  return <IRuleSetInstance>ruleSet;
}

export function applyStaticRuleSet(ruleSet: IRuleSetLike, tree: InnerNode, availableHeight: number) {
  const instance = toInstance(ruleSet, tree, availableHeight);
  if (ruleSet.stratificationLevels === 0) {
    //flat tree
    tree.children = tree.flatLeaves();
    tree.children.forEach((d) => d.parent = tree);
  }

  visit<any>(tree, (inner) => {
    inner.aggregatedHeight = functor(instance.inner.aggregatedHeight, inner);
    inner.visType = functor(instance.inner.visType, inner);
    return true;
  }, (leaf) => {
    leaf.height = functor(instance.leaf.height, leaf);
    leaf.visType = functor(instance.leaf.visType, leaf);
  });

  return instance;
}


export function applyDynamicRuleSet(ruleSet: IRuleSetLike, tree: InnerNode, availableHeight: number) {
  const instance = toInstance(ruleSet, tree, availableHeight);
  //just apply it if they are functions, i.e. dynamically computed
  visit<any>(tree, (inner) => {
    if (typeof instance.inner.aggregatedHeight === 'function') {
      inner.aggregatedHeight = instance.inner.aggregatedHeight(inner);
    }
    if (typeof instance.inner.visType === 'function') {
      inner.visType = instance.inner.visType(inner);
    }
    return true;
  }, (leaf) => {
    if (typeof instance.leaf.height === 'function') {
      leaf.height = instance.leaf.height(leaf);
    }
    if (typeof instance.leaf.visType === 'function') {
      leaf.visType = instance.leaf.visType(leaf);
    }
  });
  return instance;
}


export const defaultRuleSet = tableRuleSet;

export const ruleSets: IRuleSetLike[] = [
  tableRuleSet,
  compactRuleSet,
  tableLensRuleSet,
  notSpacefillingNotProportional,
  notSpacefillingProportional,
  spacefillingNotProportional,
  spacefillingProportional,
];
