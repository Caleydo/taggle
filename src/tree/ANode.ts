import {INode, InnerNode} from './';


export abstract class ANode {
  parent: InnerNode | null = null;
  /**
   * @deprecated
   */
  visType = 'default';
  selected: boolean = false;

  get isFirstChild() {
    return this.index <= 0;
  }

  get index() {
    return this.parent ? this.parent.children.indexOf(<any>this) : -1;
  }

  get level(): number {
    if (this.parent === null) {
      return 0;
    }
    return this.parent.level + 1;
  }

  get parents() {
    const r: InnerNode[] = [];
    let a = this.parent;
    while (a != null) {
      r.push(a);
      a = a.parent;
    }
    return r;
  }

  get path() {
    const r: INode[] = [];
    let a: INode|null = <any>this;
    while (a != null) {
      r.push(a);
      a = a.parent;
    }
    return r;
  }

  /**
   * returns the nearest sibling that matches the given selector (before or after)
   * @param {function} matches the selector to find the sibling
   * @return {number} Infinity if none found else distance
   */
  nearestSibling(matches: (sibling: ANode) => boolean): number {
    if (!this.parent) {
      return Infinity;
    }
    const c =this.parent.children;
    const index = c.indexOf(<any>this);

    const fix = (n: number) => n < 0 ? Infinity : n;

    const before = fix(c.slice(0, index).reverse().findIndex(matches));
    const after = fix(c.slice(index).findIndex(matches));

    return Math.min(before, after);
  }
}

export default ANode;
