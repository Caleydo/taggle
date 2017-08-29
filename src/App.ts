/**
 * Created by Samuel Gratzl on 10.08.2017.
 */
import {columns, data, IColumn} from './data/index';
import DebugInterface from './DebugInterface';
import {applyDynamicRuleSet, applyStaticRuleSet, defaultRuleSet, IRuleSet} from './rule/index';
import InnerNode from './tree/InnerNode';
import {fromArray} from './tree/utils';
import {createTaggleRuleSets, updateRuleSets} from './rule/TaggleRuleSet';
import * as d3 from 'd3';

export interface ITaggleRenderer {
  initTree(tree: InnerNode, ruleSet: IRuleSet): void;
  rebuild(tree: InnerNode, ruleSet: IRuleSet): void;
}

export interface ITaggleRendererClass {
  new(parent: HTMLElement, columns: IColumn[], callbacks: ICallbacks): ITaggleRenderer;
}

export interface ICallbacks {
  update(): void;
  selectionChanged(): void;
}

export default class App {
  private readonly renderer: ITaggleRenderer;
  private readonly debug: DebugInterface;

  private ruleSet: IRuleSet = defaultRuleSet;
  private readonly tree: InnerNode;

  constructor(parent: HTMLElement, clazz: ITaggleRendererClass) {

    this.renderer = new clazz(parent, columns, {
      update: () => this.update(),
      selectionChanged: () => {
        if (typeof this.ruleSet.leaf.height === 'function') {
          this.update();
        }
      }
    });

    const defaultRowHeight = typeof this.ruleSet.leaf.height === 'number' ? this.ruleSet.leaf.height : 20;
    this.tree = fromArray(data, defaultRowHeight);
    this.renderer.initTree(this.tree, this.ruleSet);
    createTaggleRuleSets(this.tree);
    applyStaticRuleSet(this.ruleSet, this.tree);

    this.debug = new DebugInterface(parent, () => this.update(), (rule) => {
      this.ruleSet = rule;
      this.renderer.initTree(this.tree, this.ruleSet);
      applyStaticRuleSet(rule, this.tree);
      this.update();
    });

    window.addEventListener('resize', () => this.update());
  }

  update() {
    updateRuleSets(this.tree, [(<HTMLElement>d3.select('main')[0][0]).clientHeight]);
    applyDynamicRuleSet(this.ruleSet, this.tree);
    this.renderer.rebuild(this.tree, this.ruleSet);
    this.debug.update(this.tree);
  }
}
