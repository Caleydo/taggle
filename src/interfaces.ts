/**
 * Created by Samuel Gratzl on 07.09.2017.
 */
import InnerNode from './tree/InnerNode';
import {IRuleSetInstance, IRuleSetLike, IStaticRuleSet} from './rule/index';
import {IColumn} from './data/index';

export interface ITaggleRenderer {
  initTree(tree: InnerNode, ruleSet: IStaticRuleSet): void;
  rebuild(tree: InnerNode, ruleSet: IStaticRuleSet, ruleSetInstance: IRuleSetInstance): void;
  readonly availableHeight: number;
}

export interface ITaggleRendererClass {
  new(parent: HTMLElement, columns: IColumn[], callbacks: ICallbacks): ITaggleRenderer;
}

export interface ICallbacks {
  update(): void;
  selectionChanged(): void;
  ruleChanged(rule: IRuleSetLike): void;
}
