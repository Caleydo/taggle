import {EAggregationType, INode, LeafNode, InnerNode} from './';

export function flatLeaves<T>(root: INode, result: LeafNode<T>[] = []): LeafNode<T>[] {
  if (root.type === 'leaf') {
    result.push(root);
    return result;
  }
  return root.children.reduce((r, child) => flatLeaves(child, r), result);
}

export function flat(root: INode, result: INode[] = []): INode[] {
  if (root.type === 'leaf' || (root.type === 'inner' && root.aggregation === EAggregationType.AGGREGATED)) {
    if (!root.filtered) {
      result.push(root);
    }
    return result;
  }
  return root.children.reduce((r, child) => flat(child, r), result);
}

export function visit<T>(root: INode, visitInner: (node: InnerNode)=>boolean, visitLeaf: (node: LeafNode<T>)=>void) {
  if (root.type === 'leaf') {
    visitLeaf(<LeafNode<T>>root);
  } else {
    const continueVisiting = visitInner(<InnerNode>root);
    if (continueVisiting) {
      root.children.forEach((child) => visit(child, visitInner, visitLeaf));
    }
  }
}

export function sort<T>(root: InnerNode, comparator: (a: T, b: T) => number) {
  const inners = <InnerNode[]>root.children.filter((n) => n.type === 'inner');
  inners.sort((a, b) => a.name.localeCompare(b.name));
  const leaves = <LeafNode<T>[]>root.children.filter((n) => n.type === 'leaf');
  leaves.sort((a, b) => comparator(a.item, b.item));

  inners.forEach((n) => sort(n, comparator));
  root.children = (<INode[]>inners).concat(leaves);
  return root;
}

export function groupBy<T>(root: InnerNode, leaves: LeafNode<T>[], grouper: (row: T) => string[]|string|null): InnerNode {
  const g = new Map<string, InnerNode>();
  root.children = [];
  leaves.forEach((n) => {
    const groups = grouper(n.item);
    if (groups === null || groups === '' || groups.length === 0) {
      n.parent = root;
      root.children.push(n);
      return;
    }
    const groupArray = Array.isArray(groups) ? groups : [groups];
    const group = groupArray[0];
    let gg: InnerNode;
    if (!g.has(group)) {
      gg = new InnerNode(group);
      gg.parent = root;
      root.children.push(gg);
      g.set(group, gg);
    } else {
      gg = g.get(group)!;
    }

    let parent = gg;
    groupArray.slice(1).forEach((group) => {
      const existing = <InnerNode>parent.children.find((n) => n.type === 'inner' && n.name === group);
      if (existing) {
        parent = existing;
      } else {
        const newInner = new InnerNode(group);
        newInner.parent = parent;
        parent.children.push(newInner);
        parent = newInner;
      }
    });
    n.parent = parent;
    parent.children.push(n);
  });
  return root;
}

export function fromArray<T>(rows: T[], rowHeight: number, grouper?: (row: T) => string[]|string): InnerNode {
  const root = new InnerNode('');

  const leaves = rows.map((r) => {
    const n = new LeafNode(r);
    n.height = rowHeight;
    n.parent = root;
    return n;
  });

  if (grouper) {
    return groupBy(root, leaves, grouper);
  } else {
    root.children = leaves;
  }

  return root;
}
