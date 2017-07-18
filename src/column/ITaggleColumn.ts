import {IColumn} from 'lineupengine/src/style';
import {LeafNode, InnerNode} from '../tree';
import {IRow} from '../data';

export interface ITaggleColumn extends IColumn {
  createHeader(document: Document): HTMLElement;

  filter(node: LeafNode<IRow>): boolean;

  createSingle(row: LeafNode<IRow>, index: number, document: Document): HTMLElement;
  updateSingle(node: HTMLElement, row: LeafNode<IRow>, index: number): HTMLElement;

  createGroup(row: InnerNode, index: number, document: Document): HTMLElement;
  updateGroup(node: HTMLElement, row: InnerNode, index: number): HTMLElement;
}

export default ITaggleColumn;
