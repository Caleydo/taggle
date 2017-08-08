import {INode, InnerNode} from './';


export abstract class ANode {
  parent: InnerNode | null = null;

  visType = 'default';
  selected: boolean = false;

  get isFirstChild() {
    return (this.parent && this.parent.children[0] === <any>this) || !this.parent;
  }

  get isLastChild() {
    return (this.parent && this.parent.children[this.parent.children.length - 1] === <any>this) || !this.parent;
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


  toPathString() {
    return this.path.reverse().join('.');
  }

  /**
   * returns the nearest sibling that matches the given selector (before or after)
   * @param {(sibling: ANode) => boolean} matches
   * @return Infinity if none found else distance
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
