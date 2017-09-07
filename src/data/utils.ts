/**
 * Created by Samuel Gratzl on 10.08.2017.
 */
import {groupBy, sort, visit} from '../tree';
import InnerNode from '../tree/InnerNode';
import {IRow} from './index';
import LeafNode from '../tree/LeafNode';
import {IColumn} from '../interfaces';


export function computeNumericalHist(leaves: LeafNode<IRow>[], column: IColumn) {
  const range = column.value.range!;
  const bins = [0, 0, 0, 0, 0];

  leaves.forEach((leaf) => {
    const bin = Math.round(((<number>leaf.item[column.name] - range[0])/(range[1] - range[0])) * 5) % 5;
    if (!isNaN(bin)) {
      bins[bin] ++;
    }
  });

  return bins;
}

export function computeCategoricalHist(leaves: LeafNode<IRow>[], column: IColumn) {
  const categories = column.value.categories!;
  const bins = categories.map(() => 0);

  leaves.forEach((leaf) => {
    const v = <string>leaf.item[column.name];
    const index = categories.findIndex((c) => c.name === v);
    if (index >= 0) {
      bins[index] ++;
    }
  });

  return bins;
}

export function reorderTree<T extends IRow>(columns: IColumn[], root: InnerNode, by: string) {
  const column = columns.find((c) => c.name === by);
  if (column && (column.value.type === 'int' || column.value.type === 'real')) {
    //desc
    sort<T>(root, (a, b) => {
      const va = <number>a[by];
      const vb = <number>b[by];
      if (isNaN(va) && isNaN(vb)) {
        return 0;
      }
      if (isNaN(va)) {
        return 1;
      }
      if (isNaN(vb)) {
        return -1;
      }
      return vb - va;
    });
  } else if (column) {
    sort<T>(root, (a, b) => (<string>a[by]).localeCompare(<string>b[by]));
  }
}

export function restratifyTree<T extends IRow>(columns: IColumn[], root: InnerNode, by: string[]) {
  if (by.length === 0) {
    //create flat again
    const leaves = root.flatLeaves();
    root.children = leaves;
    leaves.forEach((l) => l.parent = root);
  } else {
    groupBy<T>(root, root.flatLeaves(), (a) => by.map((bi) => <string>a[bi]));
  }

  updateAggregationHelper(root, columns);
}

export function updateAggregationHelper<T extends IRow>(root: InnerNode, columns: IColumn[]) {
  visit(root, (inner: InnerNode) => {
    inner.aggregate = {};
    columns.forEach((col) => {
      if (col.value.type === 'int' || col.value.type === 'real') {
        inner.aggregate[col.name] = computeNumericalHist(inner.flatLeaves<T>(), col);
      } else if (col.value.type === 'categorical') {
        inner.aggregate[col.name] = computeCategoricalHist(inner.flatLeaves<T>(), col);
      }
    });
    return true;
  }, () => undefined);
}

export function dump(root: InnerNode) {
  visit<any>(root, (inner: InnerNode) => {
    console.log(`${' '.repeat(inner.level)}-${inner.name}`);
    return true;
  }, (n) => console.log(`${' '.repeat(n.level)}-${n.toString()}`));
}
