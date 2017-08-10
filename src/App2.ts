/**
 * Created by Samuel Gratzl on 10.08.2017.
 */
import {columns, data} from './data/index';
import DebugInterface from './DebugInterface';
import {applyDynamicRuleSet, applyStaticRuleSet, defaultRuleSet, IRuleSet} from './rule/index';
import TestRenderer from './TestRenderer';
import InnerNode from './tree/InnerNode';
import {createTree, reorderTree, restratifyTree} from './utils';
import HierarchyColumn from './column/HierarchyColumn';
import CategoricalColumn from './column/CategoricalColumn';
import NumberColumn from './column/NumberColumn';
import {ITaggleColumn} from './column/ITaggleColumn';
import {StringColumn} from 'taggle2/src/column';

interface ITaggleRenderer {
  rebuild(defaultRowHeight: number): void;
}

export default class App2 {
  private readonly renderer: ITaggleRenderer;
  private readonly debug: DebugInterface;

  private ruleSet: IRuleSet = defaultRuleSet;
  private readonly tree: InnerNode;
  private groupBy: string[] = [];

  constructor(parent: HTMLElement) {
    const defaultRowHeight = typeof this.ruleSet.leaf.height === 'number' ? this.ruleSet.leaf.height : 20;
    this.tree = createTree(data, columns, defaultRowHeight, this.ruleSet);

    const rebuilder = (name: string | null, additional: boolean) => this.rebuild(name, additional);
    const cols = <ITaggleColumn[]>[new HierarchyColumn(0, {name: '', value: {type: 'string'}}, rebuilder)];
    cols.push(...columns.map((col, i) => {
      switch (col.value.type) {
        case 'categorical':
          return new CategoricalColumn(i + 1, col, rebuilder, 150);
        case 'int':
        case 'real':
          return new NumberColumn(i + 1, col, rebuilder, 150);
        default:
          return new StringColumn(i + 1, col, rebuilder, 200);
      }
    }));
    this.renderer = new TestRenderer(parent, this.tree, cols, () => this.update());

    this.debug = new DebugInterface(parent, () => this.update(), (rule) => {
      this.ruleSet = rule;
      applyStaticRuleSet(rule, this.tree);
      this.update();
    });

  }

  update() {
    applyDynamicRuleSet(this.ruleSet, this.tree);
    const defaultRowHeight = typeof this.ruleSet.leaf.height === 'number' ? this.ruleSet.leaf.height : 20;

    this.renderer.rebuild(defaultRowHeight);
    this.debug.update(this.tree);
  }

  private rebuild(groupOrSortBy: string | null, additional: boolean) {
    if (groupOrSortBy) {
      const column = columns.find((c) => c.name === groupOrSortBy)!;
      if (column.value.type === 'categorical') {
        this.groupBy = additional ? this.groupBy.concat([groupOrSortBy]) : [groupOrSortBy];
        if (this.groupBy.length > this.ruleSet.stratificationLevels) {
          this.groupBy = this.groupBy.slice(0, this.ruleSet.stratificationLevels);
        }
        if (this.groupBy.length > 0) {
          restratifyTree(columns, this.tree, this.groupBy);
        }
      } else if (this.ruleSet.sortLevels > 0) {
        // TODO support multi sorting
        reorderTree(columns, this.tree, groupOrSortBy);
      }
    }

    this.update();
  }
}
