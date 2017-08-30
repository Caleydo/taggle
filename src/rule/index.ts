/**
 * Created by Samuel Gratzl on 08.08.2017.
 */
import LeafNode from '../tree/LeafNode';
import InnerNode from '../tree/InnerNode';
import {visit} from '../tree/utils';

export {default as createChooser} from './RuleSwitcher';
import {NotSpacefillingNotProportional, SpacefillingNotProportional, NotSpacefillingProportional, SpacefillingProportional, IUpdate} from './TaggleRuleSet';

export const ruleSets:{name: string, ruleSet: IRuleSet}[] = [];

export interface IRuleSet {
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

  leaf: {
    height: number|((node: LeafNode<any>)=>number);
    visType: 'default'|'compact'|((node: LeafNode<any>) => 'default'|'compact');
  };

  inner:  {
    aggregatedHeight: number|((node: InnerNode)=>number);
    visType: 'default'|'mean'|((node: InnerNode) => 'default'|'mean');
  };
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
  }
};

export const defaultRuleSet = tableRuleSet;

const compactRuleSet: IRuleSet = Object.assign({}, defaultRuleSet, {
  name: 'compact',
  stratificationLevels: 0,
  sortLevels: 1,
  leaf: {
    height: 2,
    visType: 'compact'
  }
});

function tableLensHeight(distance: number) {
  if (!isFinite(distance)) {
    return 2;
  }
  return Math.max(2, 40 * Math.sin(Math.PI / 2 * ((7 - Math.min(distance, 7)) / 7)));
}

const tableLensRuleSet: IRuleSet = Object.assign({}, defaultRuleSet, {
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
  }
});

function functor<P, T>(r: T | ((p: P) => T), p: P) {
  if (typeof r === 'function') {
    return r(p);
  }
  return r;
}

export function applyStaticRuleSet(ruleSet: IRuleSet, tree: InnerNode) {
  if (ruleSet.stratificationLevels === 0) {
    //flat tree
    tree.children = tree.flatLeaves();
    tree.children.forEach((d) => d.parent = tree);
  }
  visit<any>(tree, (inner) => {
    inner.aggregatedHeight = functor(ruleSet.inner.aggregatedHeight, inner);
    inner.visType = functor(ruleSet.inner.visType, inner);
    return true;
  }, (leaf) => {
    leaf.height = functor(ruleSet.leaf.height, leaf);
    leaf.visType = functor(ruleSet.leaf.visType, leaf);
  });
}


export function applyDynamicRuleSet(ruleSet: IRuleSet, tree: InnerNode) {
  //just apply it if they are functions, i.e. dynamically computed
  visit<any>(tree, (inner) => {
    if (typeof ruleSet.inner.aggregatedHeight === 'function') {
      inner.aggregatedHeight = ruleSet.inner.aggregatedHeight(inner);
    }
    if (typeof ruleSet.inner.visType === 'function') {
      inner.visType = ruleSet.inner.visType(inner);
    }
    return true;
  }, (leaf) => {
    if (typeof ruleSet.leaf.height === 'function') {
      leaf.height = ruleSet.leaf.height(leaf);
    }
    if (typeof ruleSet.leaf.visType === 'function') {
      leaf.visType = ruleSet.leaf.visType(leaf);
    }
  });
}

export function updateRuleSets(root: InnerNode, params: any[]) {
  ruleSets.forEach((r) => {
    if(isUpdate(r.ruleSet)) {
      (<IUpdate>r.ruleSet).update(root, params);
    }
  });
}

function isUpdate(arg: any): arg is IUpdate {
    return arg.update !== undefined;
}

export function createRuleSets(tree: InnerNode) {
  ruleSets.push({ name: 'table', ruleSet: tableRuleSet});
  ruleSets.push({ name: 'compact', ruleSet: compactRuleSet});
  ruleSets.push({ name: 'tablelens', ruleSet: tableLensRuleSet});
  ruleSets.push({name: 'not_spacefilling not_proportional', ruleSet: new NotSpacefillingNotProportional()});
  ruleSets.push({name: 'not_spacefilling proportional', ruleSet: new NotSpacefillingProportional()});
  ruleSets.push({name: 'spacefilling not_proportional', ruleSet: new SpacefillingNotProportional(tree)});
  ruleSets.push({name: 'spacefilling proportional', ruleSet: new SpacefillingProportional(tree)});
}
