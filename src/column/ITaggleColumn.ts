import {IColumn} from 'lineupengine/src/style';
import {LeafNode, InnerNode} from '../tree';

export interface ITaggleColumn extends IColumn {
  createHeader(document: Document): HTMLElement;

  filter(node: LeafNode<number>): boolean;

  createSingle(row: LeafNode<number>, index: number, document: Document): HTMLElement;
  updateSingle(node: HTMLElement, row: LeafNode<number>, index: number): HTMLElement;

  createGroup(row: InnerNode, index: number, document: Document): HTMLElement;
  updateGroup(node: HTMLElement, row: InnerNode, index: number): HTMLElement;
}

export default ITaggleColumn;
